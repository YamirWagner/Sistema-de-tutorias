<?php
// session.php - Modelo de Sesión de Tutoría (usa nueva estructura: tutoria, cronograma, asignaciontutor)

class Session {
    private $conn;
    private $tableTutoria = 'tutoria';
    private $tableCronograma = 'cronograma';
    private $tableAsignacion = 'asignaciontutor';
    
    // Propiedades
    public $id;
    public $idAsignacion;
    public $idCronograma;
    public $tipo;
    public $fechaRealizada;
    public $observaciones;
    public $estado;
    
    // Propiedades legacy para compatibilidad
    public $tutor_id;
    public $student_id;
    public $title;
    public $description;
    public $start_time;
    public $end_time;
    public $status;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Obtener tutorías por tutor
     */
    public function getByTutor($tutorId) {
        $query = "SELECT 
                    t.id,
                    t.tipo,
                    t.fechaRealizada,
                    t.observaciones,
                    t.estado,
                    a.nombreEstudiante,
                    a.apellidoEstudiante,
                    a.codigoEstudiante,
                    c.fecha,
                    c.horaInicio,
                    c.horaFin,
                    c.ambiente,
                    c.descripcion
                  FROM {$this->tableTutoria} t
                  INNER JOIN {$this->tableAsignacion} a ON t.idAsignacion = a.id
                  INNER JOIN {$this->tableCronograma} c ON t.idCronograma = c.id
                  WHERE a.idTutor = :tutor_id
                  ORDER BY c.fecha DESC, c.horaInicio DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':tutor_id', $tutorId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener tutorías por estudiante
     */
    public function getByStudent($studentId) {
        $query = "SELECT 
                    t.id,
                    t.tipo,
                    t.fechaRealizada,
                    t.observaciones,
                    t.estado,
                    a.nombreTutor,
                    a.apellidoTutor,
                    c.fecha,
                    c.horaInicio,
                    c.horaFin,
                    c.ambiente,
                    c.descripcion
                  FROM {$this->tableTutoria} t
                  INNER JOIN {$this->tableAsignacion} a ON t.idAsignacion = a.id
                  INNER JOIN {$this->tableCronograma} c ON t.idCronograma = c.id
                  WHERE a.idEstudiante = :student_id
                  ORDER BY c.fecha DESC, c.horaInicio DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $studentId);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener tutorías pendientes de verificación
     */
    public function getPendingVerification() {
        $query = "SELECT 
                    t.id,
                    t.tipo,
                    t.fechaRealizada,
                    t.observaciones,
                    t.estado,
                    a.nombreTutor,
                    a.apellidoTutor,
                    a.nombreEstudiante,
                    a.apellidoEstudiante,
                    c.fecha,
                    c.horaInicio,
                    c.horaFin
                  FROM {$this->tableTutoria} t
                  INNER JOIN {$this->tableAsignacion} a ON t.idAsignacion = a.id
                  INNER JOIN {$this->tableCronograma} c ON t.idCronograma = c.id
                  LEFT JOIN verificacion v ON t.id = v.idTutoria
                  WHERE t.estado = 'Realizada' AND v.id IS NULL
                  ORDER BY c.fecha DESC";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener todas las tutorías con detalles
     */
    public function getAll() {
        $query = "SELECT 
                    t.id,
                    t.tipo,
                    t.fechaRealizada,
                    t.observaciones,
                    t.estado,
                    a.nombreTutor,
                    a.apellidoTutor,
                    a.nombreEstudiante,
                    a.apellidoEstudiante,
                    c.fecha,
                    c.horaInicio,
                    c.horaFin,
                    c.ambiente
                  FROM {$this->tableTutoria} t
                  INNER JOIN {$this->tableAsignacion} a ON t.idAsignacion = a.id
                  INNER JOIN {$this->tableCronograma} c ON t.idCronograma = c.id
                  ORDER BY c.fecha DESC, c.horaInicio DESC";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
}
