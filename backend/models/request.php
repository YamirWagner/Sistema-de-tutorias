<?php
// request.php - Modelo de Solicitud de Tutoría

class Request {
    private $conn;
    private $table = 'requests';
    
    public $id;
    public $student_id;
    public $tutor_id;
    public $subject;
    public $description;
    public $preferred_date;
    public $status;
    public $response;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Crear solicitud
     */
    public function create() {
        $query = "INSERT INTO {$this->table} 
                  (student_id, tutor_id, subject, description, preferred_date, status) 
                  VALUES (:student_id, :tutor_id, :subject, :description, :preferred_date, :status)";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':student_id', $this->student_id);
        $stmt->bindParam(':tutor_id', $this->tutor_id);
        $stmt->bindParam(':subject', $this->subject);
        $stmt->bindParam(':description', $this->description);
        $stmt->bindParam(':preferred_date', $this->preferred_date);
        $stmt->bindParam(':status', $this->status);
        
        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        
        return false;
    }
    
    /**
     * Obtener solicitudes por estudiante
     */
    public function getByStudent($studentId) {
        $query = "SELECT r.*, u.name as tutor_name 
                  FROM {$this->table} r 
                  JOIN users u ON r.tutor_id = u.id 
                  WHERE r.student_id = :student_id 
                  ORDER BY r.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener solicitudes por tutor
     */
    public function getByTutor($tutorId) {
        $query = "SELECT r.*, u.name as student_name 
                  FROM {$this->table} r 
                  JOIN users u ON r.student_id = u.id 
                  WHERE r.tutor_id = :tutor_id 
                  ORDER BY r.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':tutor_id', $tutorId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
}
