<?php
// schedule.php - Modelo de Cronograma

class Schedule {
    private $conn;
    private $table = 'schedules';
    
    public $id;
    public $tutor_id;
    public $day_of_week;
    public $start_time;
    public $end_time;
    public $active;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Crear horario
     */
    public function create() {
        $query = "INSERT INTO {$this->table} 
                  (tutor_id, day_of_week, start_time, end_time, active) 
                  VALUES (:tutor_id, :day_of_week, :start_time, :end_time, :active)";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':tutor_id', $this->tutor_id);
        $stmt->bindParam(':day_of_week', $this->day_of_week);
        $stmt->bindParam(':start_time', $this->start_time);
        $stmt->bindParam(':end_time', $this->end_time);
        $stmt->bindParam(':active', $this->active);
        
        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        
        return false;
    }
    
    /**
     * Obtener horarios por tutor
     */
    public function getByTutor($tutorId) {
        $query = "SELECT * FROM {$this->table} 
                  WHERE tutor_id = :tutor_id AND active = 1 
                  ORDER BY day_of_week, start_time";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':tutor_id', $tutorId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
}
