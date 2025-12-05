<?php
// user.php - Modelo de Usuario (usuariosistema y estudiante)

class User {
    private $conn;
    private $tableSistema = 'usuariosistema';
    private $tableEstudiante = 'estudiante';
    
    // Propiedades
    public $id;
    public $email;
    public $correo; // alias para email
    public $name;
    public $nombres;
    public $apellidos;
    public $dni;
    public $codigo;
    public $role;
    public $rol; // alias para role
    public $especialidad;
    public $semestre;
    public $active;
    public $estado;
    public $created_at;
    public $userType; // 'sistema' o 'estudiante'
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Obtener usuario por email (busca en ambas tablas)
     */
    public function getByEmail($email) {
        // Primero buscar en usuariosistema (Admin, Tutor, Verificador)
        $query = "SELECT 
                    id, 
                    correo as email, 
                    CONCAT(nombres, ' ', apellidos) as name,
                    nombres,
                    apellidos,
                    dni,
                    rol as role,
                    especialidad,
                    estado as active,
                    created_at,
                    'sistema' as userType
                  FROM {$this->tableSistema} 
                  WHERE correo = :email AND estado = 'Activo'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        
        $user = $stmt->fetch();
        
        // Si no se encuentra, buscar en estudiante
        if (!$user) {
            $query = "SELECT 
                        id, 
                        correo as email, 
                        CONCAT(nombres, ' ', apellidos) as name,
                        nombres,
                        apellidos,
                        codigo,
                        'student' as role,
                        'Estudiante' as rol,
                        semestre,
                        CASE WHEN estado = 'Activo' THEN 1 ELSE 0 END as active,
                        created_at,
                        'estudiante' as userType
                      FROM {$this->tableEstudiante} 
                      WHERE correo = :email AND estado = 'Activo'";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            
            $user = $stmt->fetch();
        }
        
        // Normalizar el role para el sistema
        if ($user && isset($user['role'])) {
            $roleMap = [
                'Administrador' => 'admin',
                'Tutor' => 'tutor',
                'Verificador' => 'verifier',
                'Estudiante' => 'student',
                'student' => 'student'
            ];
            $user['role'] = $roleMap[$user['role']] ?? strtolower($user['role']);
            $user['active'] = ($user['active'] === 'Activo' || $user['active'] == 1) ? 1 : 0;
        }
        
        return $user;
    }
    
    /**
     * Obtener usuario por ID (busca en ambas tablas)
     */
    public function getById($id, $userType = null) {
        if ($userType === 'estudiante') {
            $query = "SELECT 
                        id, 
                        correo as email, 
                        CONCAT(nombres, ' ', apellidos) as name,
                        nombres,
                        apellidos,
                        codigo,
                        'student' as role,
                        semestre,
                        estado as active,
                        created_at,
                        'estudiante' as userType
                      FROM {$this->tableEstudiante} 
                      WHERE id = :id";
        } else {
            $query = "SELECT 
                        id, 
                        correo as email, 
                        CONCAT(nombres, ' ', apellidos) as name,
                        nombres,
                        apellidos,
                        dni,
                        rol as role,
                        especialidad,
                        estado as active,
                        created_at,
                        'sistema' as userType
                      FROM {$this->tableSistema} 
                      WHERE id = :id";
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Listar todos los usuarios del sistema (solo usuariosistema)
     */
    public function getAll() {
        $query = "SELECT 
                    id, 
                    correo as email, 
                    CONCAT(nombres, ' ', apellidos) as name,
                    nombres,
                    apellidos,
                    dni,
                    rol as role,
                    especialidad,
                    estado as active,
                    created_at
                  FROM {$this->tableSistema} 
                  ORDER BY created_at DESC";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
    
    /**
     * Listar todos los tutores
     */
    public function getAllTutors() {
        $query = "SELECT 
                    id, 
                    correo as email, 
                    CONCAT(nombres, ' ', apellidos) as name,
                    nombres,
                    apellidos,
                    dni,
                    especialidad,
                    estado as active
                  FROM {$this->tableSistema} 
                  WHERE rol = 'Tutor' AND estado = 'Activo'
                  ORDER BY apellidos, nombres";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
    
    /**
     * Listar todos los estudiantes
     */
    public function getAllStudents() {
        $query = "SELECT 
                    id, 
                    correo as email, 
                    CONCAT(nombres, ' ', apellidos) as name,
                    nombres,
                    apellidos,
                    codigo,
                    semestre,
                    estado as active
                  FROM {$this->tableEstudiante} 
                  WHERE estado = 'Activo'
                  ORDER BY apellidos, nombres";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
    
    /**
     * Listar todos los verificadores
     */
    public function getAllVerifiers() {
        $query = "SELECT 
                    id, 
                    correo as email, 
                    CONCAT(nombres, ' ', apellidos) as name,
                    nombres,
                    apellidos,
                    dni,
                    especialidad,
                    estado as active
                  FROM {$this->tableSistema} 
                  WHERE rol = 'Verificador' AND estado = 'Activo'
                  ORDER BY apellidos, nombres";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
    
    /**
     * Listar todos los usuarios del sistema con filtros opcionales
     */
    public function getAllWithFilters($role = null, $estado = null, $search = null) {
        $conditions = [];
        $params = [];
        
        // Consulta para usuariosistema
        $queryUsuarios = "SELECT 
                    id, 
                    correo, 
                    nombres,
                    apellidos,
                    dni,
                    rol,
                    especialidad,
                    NULL as codigo,
                    NULL as semestre,
                    estado,
                    created_at,
                    'sistema' as userType
                  FROM {$this->tableSistema}";
        
        // Consulta para estudiantes
        $queryEstudiantes = "SELECT 
                    id, 
                    correo, 
                    nombres,
                    apellidos,
                    dni,
                    'Estudiante' as rol,
                    NULL as especialidad,
                    codigo,
                    semestre,
                    estado,
                    created_at,
                    'estudiante' as userType
                  FROM {$this->tableEstudiante}";
        
        // Aplicar filtros
        $whereUsuarios = [];
        $whereEstudiantes = [];
        
        if ($role && $role !== 'Todos') {
            if ($role === 'Estudiante') {
                // Solo buscar en estudiantes
                $queryUsuarios = ""; // Ignorar tabla usuarios
            } else {
                $whereUsuarios[] = "rol = :role";
                $params[':role'] = $role;
                $queryEstudiantes = ""; // Ignorar tabla estudiantes
            }
        }
        
        if ($estado && $estado !== 'Todos') {
            $whereUsuarios[] = "estado = :estado";
            $whereEstudiantes[] = "estado = :estado";
            $params[':estado'] = $estado;
        }
        
        if ($search) {
            $searchPattern = '%' . $search . '%';
            $whereUsuarios[] = "(nombres LIKE :search OR apellidos LIKE :search OR correo LIKE :search OR dni LIKE :search)";
            $whereEstudiantes[] = "(nombres LIKE :search OR apellidos LIKE :search OR correo LIKE :search OR codigo LIKE :search)";
            $params[':search'] = $searchPattern;
        }
        
        // Construir queries completas
        $finalQuery = "";
        
        if ($queryUsuarios !== "") {
            if (!empty($whereUsuarios)) {
                $queryUsuarios .= " WHERE " . implode(" AND ", $whereUsuarios);
            }
            $finalQuery = $queryUsuarios;
        }
        
        if ($queryEstudiantes !== "") {
            if (!empty($whereEstudiantes)) {
                $queryEstudiantes .= " WHERE " . implode(" AND ", $whereEstudiantes);
            }
            if ($finalQuery !== "") {
                $finalQuery .= " UNION ALL " . $queryEstudiantes;
            } else {
                $finalQuery = $queryEstudiantes;
            }
        }
        
        $finalQuery .= " ORDER BY created_at DESC";
        
        $stmt = $this->conn->prepare($finalQuery);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Crear usuario del sistema (Administrador, Tutor, Verificador)
     */
    public function createUsuarioSistema($data) {
        $query = "INSERT INTO {$this->tableSistema} 
                  (dni, nombres, apellidos, correo, rol, especialidad, estado) 
                  VALUES (:dni, :nombres, :apellidos, :correo, :rol, :especialidad, 'Activo')";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':dni', $data['dni']);
        $stmt->bindParam(':nombres', $data['nombres']);
        $stmt->bindParam(':apellidos', $data['apellidos']);
        $stmt->bindParam(':correo', $data['correo']);
        $stmt->bindParam(':rol', $data['rol']);
        $especialidad = $data['especialidad'] ?? null;
        $stmt->bindParam(':especialidad', $especialidad);
        
        return $stmt->execute();
    }
    
    /**
     * Crear estudiante
     */
    public function createEstudiante($data) {
        $query = "INSERT INTO {$this->tableEstudiante} 
                  (codigo, dni, nombres, apellidos, correo, semestre, estado) 
                  VALUES (:codigo, :dni, :nombres, :apellidos, :correo, :semestre, 'Activo')";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':codigo', $data['codigo']);
        $dni = $data['dni'] ?? null;
        $stmt->bindParam(':dni', $dni);
        $stmt->bindParam(':nombres', $data['nombres']);
        $stmt->bindParam(':apellidos', $data['apellidos']);
        $stmt->bindParam(':correo', $data['correo']);
        $stmt->bindParam(':semestre', $data['semestre']);
        
        return $stmt->execute();
    }
    
    /**
     * Actualizar estado de usuario del sistema
     */
    public function updateEstadoUsuarioSistema($id, $estado) {
        $query = "UPDATE {$this->tableSistema} SET estado = :estado WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':estado', $estado);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }
    
    /**
     * Actualizar estado de estudiante
     */
    public function updateEstadoEstudiante($id, $estado) {
        $query = "UPDATE {$this->tableEstudiante} SET estado = :estado WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':estado', $estado);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }
    
    /**
     * Actualizar datos de usuario del sistema
     */
    public function updateUsuarioSistema($id, $data) {
        $setClauses = [];
        $params = [':id' => $id];
        
        if (isset($data['nombres'])) {
            $setClauses[] = "nombres = :nombres";
            $params[':nombres'] = $data['nombres'];
        }
        if (isset($data['apellidos'])) {
            $setClauses[] = "apellidos = :apellidos";
            $params[':apellidos'] = $data['apellidos'];
        }
        if (isset($data['correo'])) {
            $setClauses[] = "correo = :correo";
            $params[':correo'] = $data['correo'];
        }
        if (isset($data['dni'])) {
            $setClauses[] = "dni = :dni";
            $params[':dni'] = $data['dni'];
        }
        if (isset($data['especialidad'])) {
            $setClauses[] = "especialidad = :especialidad";
            $params[':especialidad'] = $data['especialidad'];
        }
        
        if (empty($setClauses)) {
            throw new Exception('No hay datos para actualizar');
        }
        
        $query = "UPDATE {$this->tableSistema} SET " . implode(', ', $setClauses) . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }
    
    /**
     * Actualizar datos de estudiante
     */
    public function updateEstudiante($id, $data) {
        $setClauses = [];
        $params = [':id' => $id];
        
        if (isset($data['nombres'])) {
            $setClauses[] = "nombres = :nombres";
            $params[':nombres'] = $data['nombres'];
        }
        if (isset($data['apellidos'])) {
            $setClauses[] = "apellidos = :apellidos";
            $params[':apellidos'] = $data['apellidos'];
        }
        if (isset($data['correo'])) {
            $setClauses[] = "correo = :correo";
            $params[':correo'] = $data['correo'];
        }
        if (isset($data['semestre'])) {
            $setClauses[] = "semestre = :semestre";
            $params[':semestre'] = $data['semestre'];
        }
        
        if (empty($setClauses)) {
            throw new Exception('No hay datos para actualizar');
        }
        
        $query = "UPDATE {$this->tableEstudiante} SET " . implode(', ', $setClauses) . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }
    
    /**
     * Verificar si un correo ya existe
     */
    public function emailExists($email, $excludeId = null, $userType = null) {
        if ($userType === 'estudiante') {
            $query = "SELECT COUNT(*) as count FROM {$this->tableEstudiante} WHERE correo = :email";
            if ($excludeId) {
                $query .= " AND id != :excludeId";
            }
        } else if ($userType === 'sistema') {
            $query = "SELECT COUNT(*) as count FROM {$this->tableSistema} WHERE correo = :email";
            if ($excludeId) {
                $query .= " AND id != :excludeId";
            }
        } else {
            // Buscar en ambas tablas
            $query = "SELECT (
                        (SELECT COUNT(*) FROM {$this->tableSistema} WHERE correo = :email) +
                        (SELECT COUNT(*) FROM {$this->tableEstudiante} WHERE correo = :email)
                      ) as count";
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        if ($excludeId) {
            $stmt->bindParam(':excludeId', $excludeId);
        }
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] > 0;
    }
    
    /**
     * Verificar si un código de estudiante ya existe
     */
    public function codigoExists($codigo, $excludeId = null) {
        $query = "SELECT COUNT(*) as count FROM {$this->tableEstudiante} WHERE codigo = :codigo";
        if ($excludeId) {
            $query .= " AND id != :excludeId";
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':codigo', $codigo);
        if ($excludeId) {
            $stmt->bindParam(':excludeId', $excludeId);
        }
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] > 0;
    }
    
    /**
     * Verificar si un DNI ya existe
     */
    public function dniExists($dni, $excludeId = null, $userType = null) {
        if ($userType === 'estudiante') {
            $query = "SELECT COUNT(*) as count FROM {$this->tableEstudiante} WHERE dni = :dni";
            if ($excludeId) {
                $query .= " AND id != :excludeId";
            }
        } else if ($userType === 'sistema') {
            $query = "SELECT COUNT(*) as count FROM {$this->tableSistema} WHERE dni = :dni";
            if ($excludeId) {
                $query .= " AND id != :excludeId";
            }
        } else {
            // Buscar en ambas tablas
            $query = "SELECT (
                        (SELECT COUNT(*) FROM {$this->tableSistema} WHERE dni = :dni) +
                        (SELECT COUNT(*) FROM {$this->tableEstudiante} WHERE dni = :dni)
                      ) as count";
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':dni', $dni);
        if ($excludeId) {
            $stmt->bindParam(':excludeId', $excludeId);
        }
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] > 0;
    }
}
