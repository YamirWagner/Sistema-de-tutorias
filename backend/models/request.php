<?php
// request.php - Modelo de AsignacionTutor (nueva estructura)

class Request {
    private $conn;
    private $table = 'asignaciontutor';
    
    public $id;
    public $idTutor;
    public $nombreTutor;
    public $apellidoTutor;
    public $idEstudiante;
    public $codigoEstudiante;
    public $nombreEstudiante;
    public $apellidoEstudiante;
    public $idSemestre;
    public $fechaAsignacion;
    public $estado;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Obtener asignaciones por estudiante
     */
    public function getByStudent($studentId) {
        $query = "SELECT 
                    a.*,
                    u.especialidad,
                    s.nombre as semestre
                  FROM {$this->table} a
                  INNER JOIN usuariosistema u ON a.idTutor = u.id
                  INNER JOIN semestre s ON a.idSemestre = s.id
                  WHERE a.idEstudiante = :student_id
                  ORDER BY a.fechaAsignacion DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener asignaciones por tutor
     */
    public function getByTutor($tutorId) {
        $query = "SELECT 
                    a.*,
                    e.correo as estudiante_email,
                    s.nombre as semestre
                  FROM {$this->table} a
                  INNER JOIN estudiante e ON a.idEstudiante = e.id
                  INNER JOIN semestre s ON a.idSemestre = s.id
                  WHERE a.idTutor = :tutor_id AND a.estado = 'Activa'
                  ORDER BY a.apellidoEstudiante, a.nombreEstudiante";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':tutor_id', $tutorId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener todas las asignaciones activas
     */
    public function getAll() {
        $query = "SELECT 
                    a.*,
                    s.nombre as semestre
                  FROM {$this->table} a
                  INNER JOIN semestre s ON a.idSemestre = s.id
                  WHERE a.estado = 'Activa'
                  ORDER BY s.nombre DESC, a.apellidoTutor, a.apellidoEstudiante";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
}
