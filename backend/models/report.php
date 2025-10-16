<?php
// report.php - Modelo de Reporte de Tutoría

class Report {
    private $conn;
    private $table = 'reports';
    
    public $id;
    public $session_id;
    public $tutor_id;
    public $content;
    public $observations;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Crear reporte
     */
    public function create() {
        $query = "INSERT INTO {$this->table} (session_id, tutor_id, content, observations) 
                  VALUES (:session_id, :tutor_id, :content, :observations)";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':session_id', $this->session_id);
        $stmt->bindParam(':tutor_id', $this->tutor_id);
        $stmt->bindParam(':content', $this->content);
        $stmt->bindParam(':observations', $this->observations);
        
        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        
        return false;
    }
    
    /**
     * Obtener reporte por sesión
     */
    public function getBySession($sessionId) {
        $query = "SELECT * FROM {$this->table} WHERE session_id = :session_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_id', $sessionId);
        $stmt->execute();
        
        return $stmt->fetch();
    }
}
