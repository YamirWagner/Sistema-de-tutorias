<?php
// report.php - Modelo de Materiales y Verificación (nueva estructura)

class Report {
    private $conn;
    private $tableMateriales = 'materiales';
    private $tableVerificacion = 'verificacion';
    
    public $id;
    public $idTutoria;
    public $titulo;
    public $descripcion;
    public $tipo;
    public $enlace;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Obtener materiales por tutoría
     */
    public function getBySession($tutoriaId) {
        $query = "SELECT * FROM {$this->tableMateriales} 
                  WHERE idTutoria = :idTutoria 
                  ORDER BY fechaRegistro DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':idTutoria', $tutoriaId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener verificación de tutoría
     */
    public function getVerification($tutoriaId) {
        $query = "SELECT 
                    v.*,
                    CONCAT(u.nombres, ' ', u.apellidos) as verificador_nombre
                  FROM {$this->tableVerificacion} v
                  INNER JOIN usuariosistema u ON v.idVerificador = u.id
                  WHERE v.idTutoria = :idTutoria";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':idTutoria', $tutoriaId);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Obtener todos los materiales
     */
    public function getAllMaterials() {
        $query = "SELECT 
                    m.*,
                    t.tipo as tipo_tutoria,
                    t.estado as estado_tutoria
                  FROM {$this->tableMateriales} m
                  INNER JOIN tutoria t ON m.idTutoria = t.id
                  ORDER BY m.fechaRegistro DESC";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener todas las verificaciones
     */
    public function getAllVerifications() {
        $query = "SELECT 
                    v.*,
                    CONCAT(u.nombres, ' ', u.apellidos) as verificador_nombre,
                    t.tipo as tipo_tutoria
                  FROM {$this->tableVerificacion} v
                  INNER JOIN usuariosistema u ON v.idVerificador = u.id
                  INNER JOIN tutoria t ON v.idTutoria = t.id
                  ORDER BY v.fechaVerificacion DESC";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
}
