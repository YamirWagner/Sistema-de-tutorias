<?php
// API de Gestión de Usuarios: asignaciones de tutor-estudiante y reportes

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../models/user.php';

// Opcional para notificaciones
if (file_exists(__DIR__ . '/../core/mailer.php')) {
	require_once __DIR__ . '/../core/mailer.php';
}

header('Content-Type: application/json; charset=utf-8');

$resp = new Response();

try {
	$db = (new Database())->getConnection();
	$userModel = new User($db);

	$method = $_SERVER['REQUEST_METHOD'];
	$action = $_GET['action'] ?? $_POST['action'] ?? '';

	// Utilidades
	function getActiveSemesterId(PDO $db): ?int {
		$stmt = $db->query("SELECT id FROM semestre WHERE estado = 'Activo' LIMIT 1");
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		return $row ? (int)$row['id'] : null;
	}

	function ensureActiveTutor(PDO $db, int $tutorId): array {
		$stmt = $db->prepare("SELECT id, correo, nombres, apellidos, estado FROM usuariosistema WHERE id = :id AND rol = 'Tutor' LIMIT 1");
		$stmt->execute([':id' => $tutorId]);
		$tutor = $stmt->fetch(PDO::FETCH_ASSOC);
		if (!$tutor) throw new Exception('Tutor no encontrado');
		if ($tutor['estado'] !== 'Activo') throw new Exception('El tutor no está activo');
		return $tutor;
	}

	function ensureActiveStudents(PDO $db, array $studentIds): array {
		if (empty($studentIds)) throw new Exception('Debe seleccionar al menos un estudiante');
		$placeholders = implode(',', array_fill(0, count($studentIds), '?'));
		$stmt = $db->prepare("SELECT id, codigo, correo, nombres, apellidos, estado FROM estudiante WHERE id IN ($placeholders)");
		$stmt->execute($studentIds);
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		if (count($rows) !== count($studentIds)) throw new Exception('Algunos estudiantes no existen');
		foreach ($rows as $r) {
			if ($r['estado'] !== 'Activo') throw new Exception('Estudiante inactivo: ' . $r['codigo']);
		}
		return $rows;
	}

	if ($method === 'GET' && $action === 'list') {
		// Listado de tutores y estudiantes activos para la UI
		$tutors = $userModel->getAllTutors();
		$students = $userModel->getAllStudents();
		echo $resp->ok(['tutors' => $tutors, 'students' => $students]);
		exit;
	}

	if ($method === 'POST' && $action === 'assign') {
		// Asignar uno o varios estudiantes a un tutor específico
		$payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
		$tutorId = (int)($payload['tutorId'] ?? 0);
		$studentIds = $payload['studentIds'] ?? [];

		if (!$tutorId) throw new Exception('Tutor requerido');
		$semesterId = getActiveSemesterId($db);
		if (!$semesterId) throw new Exception('No hay semestre activo');

		$tutor = ensureActiveTutor($db, $tutorId);
		$students = ensureActiveStudents($db, array_map('intval', $studentIds));

		$db->beginTransaction();
		$nowDate = date('Y-m-d');

		// Para cada estudiante: cerrar asignaciones previas del semestre y crear nueva
		$insert = $db->prepare("INSERT INTO asignaciontutor (idTutor, nombreTutor, apellidoTutor, idEstudiante, codigoEstudiante, nombreEstudiante, apellidoEstudiante, idSemestre, fechaAsignacion, estado) VALUES (:idTutor, :nombreTutor, :apellidoTutor, :idEstudiante, :codigoEstudiante, :nombreEstudiante, :apellidoEstudiante, :idSemestre, :fechaAsignacion, 'Activa')");
		$deactivate = $db->prepare("UPDATE asignaciontutor SET estado = 'Inactiva' WHERE idEstudiante = :idEstudiante AND idSemestre = :idSemestre AND estado = 'Activa'");

		foreach ($students as $st) {
			// Cerrar anterior
			$deactivate->execute([':idEstudiante' => (int)$st['id'], ':idSemestre' => $semesterId]);
			// Insertar nueva
			$insert->execute([
				':idTutor' => $tutorId,
				':nombreTutor' => $tutor['nombres'],
				':apellidoTutor' => $tutor['apellidos'],
				':idEstudiante' => (int)$st['id'],
				':codigoEstudiante' => $st['codigo'],
				':nombreEstudiante' => $st['nombres'],
				':apellidoEstudiante' => $st['apellidos'],
				':idSemestre' => $semesterId,
				':fechaAsignacion' => $nowDate,
			]);
		}

		$db->commit();

		// Notificar tutor (opcional)
		if (class_exists('Mailer')) {
			try {
				$mailer = new Mailer();
				$list = array_map(function ($s) { return $s['codigo'] . ' - ' . $s['nombres'] . ' ' . $s['apellidos']; }, $students);
				$html = '<p>Se le asignaron los siguientes estudiantes:</p><ul>' . implode('', array_map(fn($i)=>'<li>'.htmlspecialchars($i).'</li>', $list)) . '</ul>';
				$mailer->send($tutor['correo'], 'Nuevos estudiantes asignados', $html, "Nuevos estudiantes asignados");
			} catch (Exception $e) { /* log interno */ }
		}

		echo $resp->ok(['message' => 'Asignación realizada', 'count' => count($students)]);
		exit;
	}

	if ($method === 'POST' && $action === 'reassign') {
		// Reasignar estudiantes de un tutor a otro
		$payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
		$fromTutorId = (int)($payload['fromTutorId'] ?? 0);
		$toTutorId = (int)($payload['toTutorId'] ?? 0);
		$studentIds = $payload['studentIds'] ?? [];

		if (!$fromTutorId || !$toTutorId) throw new Exception('Debe indicar tutor origen y destino');
		if ($fromTutorId === $toTutorId) throw new Exception('El tutor destino debe ser distinto');

		$semesterId = getActiveSemesterId($db);
		if (!$semesterId) throw new Exception('No hay semestre activo');

		$toTutor = ensureActiveTutor($db, $toTutorId);
		$students = ensureActiveStudents($db, array_map('intval', $studentIds));

		$db->beginTransaction();
		$nowDate = date('Y-m-d');

		$deactivate = $db->prepare("UPDATE asignaciontutor SET estado = 'Inactiva' WHERE idEstudiante = :idEstudiante AND idSemestre = :idSemestre AND estado = 'Activa'");
		$insert = $db->prepare("INSERT INTO asignaciontutor (idTutor, nombreTutor, apellidoTutor, idEstudiante, codigoEstudiante, nombreEstudiante, apellidoEstudiante, idSemestre, fechaAsignacion, estado) VALUES (:idTutor, :nombreTutor, :apellidoTutor, :idEstudiante, :codigoEstudiante, :nombreEstudiante, :apellidoEstudiante, :idSemestre, :fechaAsignacion, 'Activa')");

		foreach ($students as $st) {
			// Cerrar asignación previa en semestre actual
			$deactivate->execute([':idEstudiante' => (int)$st['id'], ':idSemestre' => $semesterId]);
			// Insertar nueva asignación con tutor destino
			$insert->execute([
				':idTutor' => $toTutorId,
				':nombreTutor' => $toTutor['nombres'],
				':apellidoTutor' => $toTutor['apellidos'],
				':idEstudiante' => (int)$st['id'],
				':codigoEstudiante' => $st['codigo'],
				':nombreEstudiante' => $st['nombres'],
				':apellidoEstudiante' => $st['apellidos'],
				':idSemestre' => $semesterId,
				':fechaAsignacion' => $nowDate,
			]);
		}

		$db->commit();

		// Notificar nuevo tutor
		if (class_exists('Mailer')) {
			try {
				$mailer = new Mailer();
				$list = array_map(function ($s) { return $s['codigo'] . ' - ' . $s['nombres'] . ' ' . $s['apellidos']; }, $students);
				$html = '<p>Se le reasignaron estudiantes:</p><ul>' . implode('', array_map(fn($i)=>'<li>'.htmlspecialchars($i).'</li>', $list)) . '</ul>';
				$mailer->send($toTutor['correo'], 'Reasignación de estudiantes', $html, "Reasignación de estudiantes");
			} catch (Exception $e) { /* log interno */ }
		}

		echo $resp->ok(['message' => 'Reasignación realizada', 'count' => count($students)]);
		exit;
	}

	if ($method === 'GET' && $action === 'report') {
		// Reporte: lista de tutorados con tutor y ambiente del cronograma del semestre activo
		$semesterId = getActiveSemesterId($db);
		if (!$semesterId) throw new Exception('No hay semestre activo');

		// Asignaciones activas
		$stmt = $db->prepare("SELECT a.idTutor, CONCAT(u.nombres, ' ', u.apellidos) AS tutor,
									 a.idEstudiante, a.codigoEstudiante AS codigo, CONCAT(e.nombres,' ',e.apellidos) AS estudiante
							  FROM asignaciontutor a
							  INNER JOIN usuariosistema u ON u.id = a.idTutor
							  INNER JOIN estudiante e ON e.id = a.idEstudiante
							  WHERE a.idSemestre = :sem AND a.estado = 'Activa'");
		$stmt->execute([':sem' => $semesterId]);
		$asignaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

		// Cronograma del semestre: tomar primer match por fecha/hora (simplificado)
		$cron = $db->prepare("SELECT fecha, horaInicio, horaFin, ambiente FROM cronograma WHERE idSemestre = :sem ORDER BY fecha, horaInicio");
		$cron->execute([':sem' => $semesterId]);
		$slots = $cron->fetchAll(PDO::FETCH_ASSOC);

		// Emparejar ambiente/fecha/hora de forma simple (round-robin)
		$report = [];
		$i = 0; $n = max(count($slots), 1);
		foreach ($asignaciones as $a) {
			$slot = $slots[$i % $n] ?? ['fecha' => null, 'horaInicio' => null, 'horaFin' => null, 'ambiente' => null];
			$report[] = [
				'estudiante' => $a['estudiante'],
				'codigo' => $a['codigo'],
				'tutor' => $a['tutor'],
				'fecha' => $slot['fecha'],
				'hora' => ($slot['horaInicio'] && $slot['horaFin']) ? ($slot['horaInicio'] . ' - ' . $slot['horaFin']) : null,
				'ambiente' => $slot['ambiente'],
			];
			$i++;
		}

		echo $resp->ok(['items' => $report]);
		exit;
	}

	echo $resp->error('Acción no soportada', 400);
} catch (Exception $e) {
	echo $resp->error($e->getMessage(), 400);
}
?>
