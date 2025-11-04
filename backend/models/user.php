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
}
