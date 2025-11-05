<?php
// logacceso.php - Modelo de Bitácora (Log de Acceso y Actividad)

class LogAcceso {
    private $conn;
    private $table = 'logacceso';

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Registrar un evento en la bitácora
     * Params (array $data):
     * - idUsuario (int|null)
      * - idEstudiante (int|null)
      * - usuario (string|null)
     * - tipoAcceso (string|null)  // Administrador | Tutor | Verificador
     * - accion (string)           // requerido
     * - descripcion (string|null)
     * - estadoSesion (string|null) // 'activa' | 'cerrada'
     * - ipOrigen (string|null)
     * - fechaHora (string|null)    // 'Y-m-d H:i:s'
      * - correo (string|null)       // opcional para resolver ids
      * - codigo (string|null)       // opcional para resolver estudiante
     * Return: int idLog insertado
     */
    public function registrar(array $data) {
        $idUsuario = isset($data['idUsuario']) ? (int)$data['idUsuario'] : null;
          $idEstudiante = isset($data['idEstudiante']) ? (int)$data['idEstudiante'] : null;
        $usuario = isset($data['usuario']) ? trim($data['usuario']) : null;
        $tipoAcceso = isset($data['tipoAcceso']) ? trim($data['tipoAcceso']) : null;
        $accion = isset($data['accion']) ? trim($data['accion']) : '';
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : null;
        $estadoSesion = isset($data['estadoSesion']) ? trim($data['estadoSesion']) : null;
        $ipOrigen = isset($data['ipOrigen']) ? trim($data['ipOrigen']) : null;
        $fechaHora = isset($data['fechaHora']) ? trim($data['fechaHora']) : date('Y-m-d H:i:s');
          $correo = isset($data['correo']) ? trim($data['correo']) : null;
          $codigo = isset($data['codigo']) ? trim($data['codigo']) : null;

        if ($accion === '') {
            throw new Exception('El campo accion es requerido');
        }

        // Resolver idUsuario (usuariosistema) si aplica
        if ($idUsuario === null && $usuario && $tipoAcceso && in_array($tipoAcceso, ['Administrador','Tutor','Verificador'])) {
            try {
                if ($correo) {
                    $q = "SELECT id FROM usuariosistema WHERE correo = :correo AND rol = :rol AND estado = 'Activo' LIMIT 1";
                    $s = $this->conn->prepare($q);
                    $s->bindValue(':correo', $correo);
                    $s->bindValue(':rol', $tipoAcceso);
                    $s->execute();
                } else {
                    $q = "SELECT id FROM usuariosistema WHERE CONCAT(nombres, ' ', apellidos) = :nombre AND rol = :rol AND estado = 'Activo' LIMIT 1";
                    $s = $this->conn->prepare($q);
                    $s->bindValue(':nombre', $usuario);
                    $s->bindValue(':rol', $tipoAcceso);
                    $s->execute();
                }
                $row = $s->fetch();
                if ($row && isset($row['id'])) {
                    $idUsuario = (int)$row['id'];
                }
            } catch (Exception $e) {
                // No bloquear si no se puede inferir
                error_log('No se pudo inferir idUsuario en logacceso: ' . $e->getMessage());
            }
        }

        // Resolver idEstudiante si aplica
        if ($idEstudiante === null && ($tipoAcceso === 'Estudiante')) {
            try {
                if ($correo) {
                    $q = "SELECT id FROM estudiante WHERE correo = :correo AND estado = 'Activo' LIMIT 1";
                    $s = $this->conn->prepare($q);
                    $s->bindValue(':correo', $correo);
                    $s->execute();
                } elseif ($codigo) {
                    $q = "SELECT id FROM estudiante WHERE codigo = :codigo AND estado = 'Activo' LIMIT 1";
                    $s = $this->conn->prepare($q);
                    $s->bindValue(':codigo', $codigo);
                    $s->execute();
                } elseif ($usuario) {
                    $q = "SELECT id FROM estudiante WHERE CONCAT(nombres, ' ', apellidos) = :nombre AND estado = 'Activo' LIMIT 1";
                    $s = $this->conn->prepare($q);
                    $s->bindValue(':nombre', $usuario);
                    $s->execute();
                } else {
                    $s = null;
                }
                if ($s) {
                    $row = $s->fetch();
                    if ($row && isset($row['id'])) {
                        $idEstudiante = (int)$row['id'];
                    }
                }
            } catch (Exception $e) {
                error_log('No se pudo inferir idEstudiante en logacceso: ' . $e->getMessage());
            }
        }

        $sql = "INSERT INTO {$this->table}
                (idUsuario, idEstudiante, usuario, tipoAcceso, accion, descripcion, fechaHora, estadoSesion, ipOrigen)
                VALUES (:idUsuario, :idEstudiante, :usuario, :tipoAcceso, :accion, :descripcion, :fechaHora, :estadoSesion, :ipOrigen)";
        $stmt = $this->conn->prepare($sql);

        // bind
        if ($idUsuario === 0) { $idUsuario = null; }
        if ($idUsuario === null) {
            $stmt->bindValue(':idUsuario', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':idUsuario', $idUsuario, PDO::PARAM_INT);
        }
        if ($idEstudiante === 0) { $idEstudiante = null; }
        if ($idEstudiante === null) {
            $stmt->bindValue(':idEstudiante', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':idEstudiante', $idEstudiante, PDO::PARAM_INT);
        }
        $stmt->bindValue(':usuario', $usuario);
        $stmt->bindValue(':tipoAcceso', $tipoAcceso);
        $stmt->bindValue(':accion', $accion);
        $stmt->bindValue(':descripcion', $descripcion);
        $stmt->bindValue(':fechaHora', $fechaHora);
        $stmt->bindValue(':estadoSesion', $estadoSesion);
        $stmt->bindValue(':ipOrigen', $ipOrigen);

        $stmt->execute();
        return (int)$this->conn->lastInsertId();
    }

    /**
     * Listar eventos de la bitácora con filtros básicos
     */
    public function listar(array $filters = [], $limit = 100, $offset = 0) {
        $where = [];
        $params = [];

        if (!empty($filters['idUsuario'])) { $where[] = 'idUsuario = :idUsuario'; $params[':idUsuario'] = (int)$filters['idUsuario']; }
        if (!empty($filters['tipoAcceso'])) { $where[] = 'tipoAcceso = :tipoAcceso'; $params[':tipoAcceso'] = $filters['tipoAcceso']; }
        if (!empty($filters['accion'])) { $where[] = 'accion = :accion'; $params[':accion'] = $filters['accion']; }
        if (!empty($filters['estadoSesion'])) { $where[] = 'estadoSesion = :estadoSesion'; $params[':estadoSesion'] = $filters['estadoSesion']; }
        if (!empty($filters['desde'])) { $where[] = 'fechaHora >= :desde'; $params[':desde'] = $filters['desde']; }
        if (!empty($filters['hasta'])) { $where[] = 'fechaHora <= :hasta'; $params[':hasta'] = $filters['hasta']; }

        $sql = "SELECT idLog, idUsuario, usuario, tipoAcceso, accion, descripcion, fechaHora, estadoSesion, ipOrigen
                FROM {$this->table}";
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY fechaHora DESC, idLog DESC LIMIT :limit OFFSET :offset';

        $stmt = $this->conn->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
