<?php
// API de Gestión de Usuarios: CRUD completo de usuarios del sistema y estudiantes

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../models/user.php';

header('Content-Type: application/json; charset=utf-8');

try {
	$db = (new Database())->getConnection();
	$userModel = new User($db);

	$method = $_SERVER['REQUEST_METHOD'];
	
	// Obtener action desde GET, POST o JSON payload
	$action = $_GET['action'] ?? $_POST['action'] ?? '';
	
	// Si es POST con JSON, extraer action del payload
	if ($method === 'POST' && empty($action)) {
		$payload = json_decode(file_get_contents('php://input'), true);
		$action = $payload['action'] ?? '';
	}

	// ============= LISTAR USUARIOS CON FILTROS =============
	if ($method === 'GET' && $action === 'list') {
		$role = $_GET['role'] ?? null;
		$estado = $_GET['estado'] ?? null;
		$search = $_GET['search'] ?? null;
		
		$users = $userModel->getAllWithFilters($role, $estado, $search);
		echo Response::success(['users' => $users]);
		exit;
	}

	// ============= REGISTRAR NUEVO USUARIO =============
	if ($method === 'POST' && $action === 'register') {
		$payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
		
		$rol = $payload['rol'] ?? '';
		$nombres = trim($payload['nombres'] ?? '');
		$apellidos = trim($payload['apellidos'] ?? '');
		$correo = trim($payload['correo'] ?? '');
		$dni = trim($payload['dni'] ?? '');
		
		// Validaciones básicas
		if (!$nombres || !$apellidos || !$correo || !$rol) {
			throw new Exception('Campos obligatorios: nombres, apellidos, correo y rol');
		}
		
		// Validar formato de correo
		if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
			throw new Exception('Formato de correo inválido');
		}
		
		// Verificar si el correo ya existe
		if ($userModel->emailExists($correo)) {
			throw new Exception('El correo electrónico ya está registrado');
		}
		
		// Verificar si el DNI ya existe (si se proporcionó)
		if ($dni && $userModel->dniExists($dni)) {
			throw new Exception('El DNI ya está registrado');
		}
		
		$db->beginTransaction();
		
		try {
			if ($rol === 'Estudiante') {
				// Registrar estudiante
				$codigo = trim($payload['codigo'] ?? '');
				$semestre = trim($payload['semestre'] ?? '');
				
				if (!$codigo || !$semestre) {
					throw new Exception('Para estudiantes es obligatorio: código y semestre');
				}
				
				// Verificar si el código ya existe
				if ($userModel->codigoExists($codigo)) {
					throw new Exception('El código de estudiante ya está registrado');
				}
				
				$data = [
					'codigo' => $codigo,
					'dni' => $dni ?: null,
					'nombres' => $nombres,
					'apellidos' => $apellidos,
					'correo' => $correo,
					'semestre' => $semestre
				];
				
				$userModel->createEstudiante($data);
			} else {
				// Registrar usuario del sistema (Administrador, Tutor, Verificador)
				if (!in_array($rol, ['Administrador', 'Tutor', 'Verificador'])) {
					throw new Exception('Rol no válido');
				}
				
				if (!$dni) {
					throw new Exception('El DNI es obligatorio para usuarios del sistema');
				}
				
				$especialidad = trim($payload['especialidad'] ?? '');
				
				$data = [
					'dni' => $dni,
					'nombres' => $nombres,
					'apellidos' => $apellidos,
					'correo' => $correo,
					'rol' => $rol,
					'especialidad' => $especialidad ?: null
				];
				
				$userModel->createUsuarioSistema($data);
			}
			
			$db->commit();
			echo Response::success(['message' => 'Usuario registrado exitosamente']);
		} catch (Exception $e) {
			$db->rollBack();
			throw $e;
		}
		exit;
	}

	// ============= ACTIVAR USUARIO =============
	if ($method === 'POST' && $action === 'activate') {
		$payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
		
		$userId = (int)($payload['userId'] ?? 0);
		$userType = $payload['userType'] ?? '';
		
		if (!$userId || !$userType) {
			throw new Exception('Se requiere userId y userType');
		}
		
		if ($userType === 'estudiante') {
			$userModel->updateEstadoEstudiante($userId, 'Activo');
		} else if ($userType === 'sistema') {
			$userModel->updateEstadoUsuarioSistema($userId, 'Activo');
		} else {
			throw new Exception('Tipo de usuario no válido');
		}
		
		echo Response::success(['message' => 'Usuario activado']);
		exit;
	}

	// ============= DESACTIVAR USUARIO =============
	if ($method === 'POST' && $action === 'deactivate') {
		$payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
		
		$userId = (int)($payload['userId'] ?? 0);
		$userType = $payload['userType'] ?? '';
		
		if (!$userId || !$userType) {
			throw new Exception('Se requiere userId y userType');
		}
		
		if ($userType === 'estudiante') {
			$userModel->updateEstadoEstudiante($userId, 'Inactivo');
		} else if ($userType === 'sistema') {
			$userModel->updateEstadoUsuarioSistema($userId, 'Inactivo');
		} else {
			throw new Exception('Tipo de usuario no válido');
		}
		
		echo Response::success(['message' => 'Usuario desactivado']);
		exit;
	}

	// ============= ACTUALIZAR USUARIO =============
	if ($method === 'POST' && $action === 'update') {
		$payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
		
		$userId = (int)($payload['userId'] ?? 0);
		$userType = $payload['userType'] ?? '';
		$nombres = trim($payload['nombres'] ?? '');
		$apellidos = trim($payload['apellidos'] ?? '');
		$correo = trim($payload['correo'] ?? '');
		
		if (!$userId || !$userType || !$nombres || !$apellidos || !$correo) {
			throw new Exception('Campos obligatorios: userId, userType, nombres, apellidos, correo');
		}
		
		// Validar formato de correo
		if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
			throw new Exception('Formato de correo inválido');
		}
		
		// Actualizar según tipo de usuario
		if ($userType === 'estudiante') {
			$semestre = trim($payload['semestre'] ?? '');
			if (!$semestre) {
				throw new Exception('El semestre es obligatorio para estudiantes');
			}
			
			$updateData = [
				'nombres' => $nombres,
				'apellidos' => $apellidos,
				'correo' => $correo,
				'semestre' => $semestre
			];
			
			$userModel->updateEstudiante($userId, $updateData);
		} else if ($userType === 'sistema') {
			$updateData = [
				'nombres' => $nombres,
				'apellidos' => $apellidos,
				'correo' => $correo
			];
			
			if (isset($payload['dni']) && $payload['dni']) {
				$updateData['dni'] = trim($payload['dni']);
			}
			
			if (isset($payload['especialidad'])) {
				$updateData['especialidad'] = trim($payload['especialidad']);
			}
			
			$userModel->updateUsuarioSistema($userId, $updateData);
		} else {
			throw new Exception('Tipo de usuario no válido');
		}
		
		echo Response::success(['message' => 'Usuario actualizado correctamente']);
		exit;
	}

	echo Response::error('Acción no soportada', 400);
} catch (Exception $e) {
	echo Response::error($e->getMessage(), 400);
}
?>
