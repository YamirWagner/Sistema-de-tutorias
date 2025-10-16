<?php
// user.php - Modelo de Usuario

class User {
    private $conn;
    private $table = 'users';
    
    // Propiedades
    public $id;
    public $email;
    public $name;
    public $role;
    public $active;
    public $created_at;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Obtener usuario por email
     */
    public function getByEmail($email) {
        $query = "SELECT id, email, name, role, active, created_at 
                  FROM {$this->table} 
                  WHERE email = :email";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Obtener usuario por ID
     */
    public function getById($id) {
        $query = "SELECT id, email, name, role, active, created_at 
                  FROM {$this->table} 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Crear usuario
     */
    public function create() {
        $query = "INSERT INTO {$this->table} (email, name, role, active) 
                  VALUES (:email, :name, :role, :active)";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':email', $this->email);
        $stmt->bindParam(':name', $this->name);
        $stmt->bindParam(':role', $this->role);
        $stmt->bindParam(':active', $this->active);
        
        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        
        return false;
    }
    
    /**
     * Actualizar usuario
     */
    public function update() {
        $query = "UPDATE {$this->table} 
                  SET name = :name, role = :role, active = :active 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':id', $this->id);
        $stmt->bindParam(':name', $this->name);
        $stmt->bindParam(':role', $this->role);
        $stmt->bindParam(':active', $this->active);
        
        return $stmt->execute();
    }
    
    /**
     * Eliminar usuario
     */
    public function delete() {
        $query = "DELETE FROM {$this->table} WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);
        
        return $stmt->execute();
    }
    
    /**
     * Listar todos los usuarios
     */
    public function getAll() {
        $query = "SELECT id, email, name, role, active, created_at 
                  FROM {$this->table} 
                  ORDER BY created_at DESC";
        
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll();
    }
}
