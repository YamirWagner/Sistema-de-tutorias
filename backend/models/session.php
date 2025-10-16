<?php
// session.php - Modelo de Sesión de Tutoría

class Session {
    private $conn;
    private $table = 'sessions';
    
    // Propiedades
    public $id;
    public $tutor_id;
    public $student_id;
    public $title;
    public $description;
    public $start_time;
    public $end_time;
    public $status;
    public $verified;
    public $verified_by;
    public $google_event_id;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Crear sesión
     */
    public function create() {
        $query = "INSERT INTO {$this->table} 
                  (tutor_id, student_id, title, description, start_time, end_time, status) 
                  VALUES (:tutor_id, :student_id, :title, :description, :start_time, :end_time, :status)";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':tutor_id', $this->tutor_id);
        $stmt->bindParam(':student_id', $this->student_id);
        $stmt->bindParam(':title', $this->title);
        $stmt->bindParam(':description', $this->description);
        $stmt->bindParam(':start_time', $this->start_time);
        $stmt->bindParam(':end_time', $this->end_time);
        $stmt->bindParam(':status', $this->status);
        
        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        
        return false;
    }
    
    /**
     * Actualizar sesión
     */
    public function update() {
        $query = "UPDATE {$this->table} 
                  SET title = :title, description = :description, 
                      start_time = :start_time, end_time = :end_time, 
                      status = :status 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':id', $this->id);
        $stmt->bindParam(':title', $this->title);
        $stmt->bindParam(':description', $this->description);
        $stmt->bindParam(':start_time', $this->start_time);
        $stmt->bindParam(':end_time', $this->end_time);
        $stmt->bindParam(':status', $this->status);
        
        return $stmt->execute();
    }
    
    /**
     * Obtener sesión por ID
     */
    public function getById($id) {
        $query = "SELECT * FROM {$this->table} WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Obtener sesiones por tutor
     */
    public function getByTutor($tutorId) {
        $query = "SELECT s.*, u.name as student_name 
                  FROM {$this->table} s 
                  LEFT JOIN users u ON s.student_id = u.id 
                  WHERE s.tutor_id = :tutor_id 
                  ORDER BY s.start_time DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':tutor_id', $tutorId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener sesiones por estudiante
     */
    public function getByStudent($studentId) {
        $query = "SELECT s.*, u.name as tutor_name 
                  FROM {$this->table} s 
                  JOIN users u ON s.tutor_id = u.id 
                  WHERE s.student_id = :student_id 
                  ORDER BY s.start_time DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
}
