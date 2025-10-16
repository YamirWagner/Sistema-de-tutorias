<?php
// response.php - Formato de salida JSON

class Response {
    
    /**
     * Respuesta exitosa
     */
    public static function success($data = null, $message = 'Operación exitosa', $code = 200) {
        http_response_code($code);
        
        $response = [
            'success' => true,
            'message' => $message
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    /**
     * Respuesta de error
     */
    public static function error($message = 'Error en la operación', $code = 400, $errors = null) {
        http_response_code($code);
        
        $response = [
            'success' => false,
            'message' => $message
        ];
        
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    /**
     * Respuesta no autorizada
     */
    public static function unauthorized($message = 'No autorizado') {
        self::error($message, 401);
    }
    
    /**
     * Respuesta prohibida
     */
    public static function forbidden($message = 'Acceso denegado') {
        self::error($message, 403);
    }
    
    /**
     * Respuesta no encontrado
     */
    public static function notFound($message = 'Recurso no encontrado') {
        self::error($message, 404);
    }
    
    /**
     * Respuesta de validación
     */
    public static function validation($errors, $message = 'Errores de validación') {
        self::error($message, 422, $errors);
    }
    
    /**
     * Respuesta de error del servidor
     */
    public static function serverError($message = 'Error interno del servidor') {
        self::error($message, 500);
    }
}
