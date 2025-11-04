<?php
// schedule.php - Modelo de Cronograma (nueva estructura)

class Schedule {
    private $conn;
    private $table = 'cronograma';
    
    public $id;
    public $idSemestre;
    public $fecha;
    public $horaInicio;
    public $horaFin;
    public $ambiente;
    public $descripcion;
    public $estado;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Obtener cronograma por semestre
     */
    public function getBySemestre($semestreId) {
        $query = "SELECT * FROM {$this->table} 
                  WHERE idSemestre = :idSemestre 
                  ORDER BY fecha, horaInicio";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':idSemestre', $semestreId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener cronograma activo (semestre actual)
     */
    public function getActiveSemester() {
        $query = "SELECT c.* 
                  FROM {$this->table} c
                  INNER JOIN semestre s ON c.idSemestre = s.id
                  WHERE s.estado = 'Activo'
                  ORDER BY c.fecha, c.horaInicio";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener todos los cronogramas
     */
    public function getAll() {
        $query = "SELECT 
                    c.*,
                    s.nombre as semestre
                  FROM {$this->table} c
                  INNER JOIN semestre s ON c.idSemestre = s.id
                  ORDER BY c.fecha DESC, c.horaInicio";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
}
