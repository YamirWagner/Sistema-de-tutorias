<?php
// google.php - Conexión con Google Calendar API

class GoogleCalendar {
    private $client;
    private $mode = 'oauth'; // 'oauth' | 'service_account'

    public function __construct() {
        // Cargar autoload si existe (Composer opcional)
        $autoload = BASE_PATH . '/vendor/autoload.php';
        if (file_exists($autoload)) {
            require_once $autoload;
        }

        if (!class_exists('Google_Client')) {
            throw new Exception('La librería de Google API PHP no está instalada. Instala google/apiclient con Composer.');
        }

        $this->client = new Google_Client();
        $this->configure();
    }

    /**
     * Configurar cliente de Google
     */
    private function configure() {
        $useSA = filter_var(env('GOOGLE_USE_SERVICE_ACCOUNT', 'false'), FILTER_VALIDATE_BOOLEAN);
        $saPath = env('GOOGLE_SA_JSON_PATH', '');
        if ($useSA) {
            if (empty($saPath) || !file_exists($saPath)) {
                throw new Exception('GOOGLE_SA_JSON_PATH no existe.');
            }
            $this->mode = 'service_account';
            $this->client->setAuthConfig($saPath);
            $this->client->setScopes(['https://www.googleapis.com/auth/calendar']);
            $impersonate = env('GOOGLE_SA_IMPERSONATE_EMAIL', '');
            if (!empty($impersonate)) {
                $this->client->setSubject($impersonate); // Requiere delegación a nivel de dominio (Workspace)
            }
        } else {
            if (empty(GOOGLE_CLIENT_ID) || empty(GOOGLE_CLIENT_SECRET) || empty(GOOGLE_REDIRECT_URI)) {
                throw new Exception('Faltan GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI en el .env');
            }
            $this->client->setClientId(GOOGLE_CLIENT_ID);
            $this->client->setClientSecret(GOOGLE_CLIENT_SECRET);
            $this->client->setRedirectUri(GOOGLE_REDIRECT_URI);
            // Usar scope por string para evitar dependencia en tiempo de carga de la clase
            $this->client->addScope('https://www.googleapis.com/auth/calendar');
        }
    }

    public function usingServiceAccount(): bool { return $this->mode === 'service_account'; }

    // Ajustes de OAuth adicionales
    public function setState(string $state): void { $this->client->setState($state); }
    public function setAccessType(string $type): void { $this->client->setAccessType($type); }
    public function setPrompt(string $prompt): void { $this->client->setPrompt($prompt); }

    /**
     * Obtener URL de autenticación
     */
    public function getAuthUrl() {
        if ($this->usingServiceAccount()) {
            throw new Exception('No se requiere autenticación para cuenta de servicio.');
        }
        return $this->client->createAuthUrl();
    }

    /**
     * Autenticar con código
     */
    public function authenticate($code) {
        try {
            if ($this->usingServiceAccount()) {
                throw new Exception('authenticate() no aplica en modo cuenta de servicio');
            }
            $token = $this->client->fetchAccessTokenWithAuthCode($code);
            if (isset($token['error'])) {
                throw new Exception($token['error_description'] ?? $token['error']);
            }
            $this->client->setAccessToken($token);
            return $token;
        } catch (Exception $e) {
            error_log("Error en autenticación Google: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Establecer token de acceso
     */
    public function setAccessToken($token) {
        $this->client->setAccessToken($token);
    }

    /**
     * Administración de tokens por usuario (archivo)
     */
    private function tokensDir(): string { return BASE_PATH . '/storage/tokens'; }
    private function tokenPathForUser($userId): string { return $this->tokensDir() . '/' . intval($userId) . '.json'; }

    public function hasTokenForUser($userId): bool {
        return file_exists($this->tokenPathForUser($userId));
    }

    public function setTokenForUser($userId): void {
        $path = $this->tokenPathForUser($userId);
        if (!file_exists($path)) { throw new Exception('Token no encontrado para el usuario'); }
        $json = file_get_contents($path);
        $token = json_decode($json, true) ?: [];
        $this->client->setAccessToken($token);
        // Refrescar si expiró
        if ($this->client->isAccessTokenExpired() && isset($token['refresh_token'])) {
            $newToken = $this->client->fetchAccessTokenWithRefreshToken($token['refresh_token']);
            if (!isset($newToken['error'])) {
                $token = array_merge($token, $newToken);
                $this->client->setAccessToken($token);
                $this->saveTokenForUser($userId, $token);
            }
        }
    }

    public function saveTokenForUser($userId, array $token): void {
        $dir = $this->tokensDir();
        if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
        file_put_contents($this->tokenPathForUser($userId), json_encode($token, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    }

    /**
     * Asegurar autenticación preparada para un usuario dado.
     */
    public function ensureForUser($userId): void {
        if ($this->usingServiceAccount()) {
            return; // Ya autenticado con cuenta de servicio
        }
        $this->setTokenForUser($userId);
    }

    /**
     * Crear evento en el calendario
     */
    public function createEvent($eventData) {
        try {
            $serviceClass = 'Google_Service_' . 'Calendar';
            $eventClass = 'Google_Service_Calendar_' . 'Event';
            if (!class_exists($serviceClass)) { throw new Exception('Clase Google_Service_Calendar no disponible'); }
            $service = new $serviceClass($this->client);

            $event = new $eventClass([
                'summary' => $eventData['title'],
                'description' => $eventData['description'] ?? '',
                'start' => [
                    'dateTime' => $eventData['start'],
                    'timeZone' => TIMEZONE,
                ],
                'end' => [
                    'dateTime' => $eventData['end'],
                    'timeZone' => TIMEZONE,
                ],
            ]);

            $calendarId = 'primary';
            $event = $service->events->insert($calendarId, $event);

            return [
                'id' => $event->getId(),
                'link' => $event->getHtmlLink()
            ];

        } catch (Exception $e) {
            error_log("Error al crear evento: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Listar eventos
     */
    public function listEvents($maxResults = 10) {
        try {
            $serviceClass = 'Google_Service_' . 'Calendar';
            if (!class_exists($serviceClass)) { throw new Exception('Clase Google_Service_Calendar no disponible'); }
            $service = new $serviceClass($this->client);

            $optParams = [
                'maxResults' => $maxResults,
                'orderBy' => 'startTime',
                'singleEvents' => true,
                'timeMin' => date('c'),
            ];

            $results = $service->events->listEvents('primary', $optParams);
            $events = $results->getItems();

            $eventList = [];
            foreach ($events as $event) {
                $eventList[] = [
                    'id' => $event->getId(),
                    'title' => $event->getSummary(),
                    'description' => $event->getDescription(),
                    'start' => $event->getStart()->getDateTime() ?: $event->getStart()->getDate(),
                    'end' => $event->getEnd()->getDateTime() ?: $event->getEnd()->getDate(),
                ];
            }

            return $eventList;

        } catch (Exception $e) {
            error_log("Error al listar eventos: {$e->getMessage()}");
            return [];
        }
    }

    /**
     * Actualizar evento
     */
    public function updateEvent($eventId, $eventData) {
        try {
            $serviceClass = 'Google_Service_' . 'Calendar';
            $eventDateTimeClass = 'Google_Service_Calendar_' . 'EventDateTime';
            if (!class_exists($serviceClass)) { throw new Exception('Clase Google_Service_Calendar no disponible'); }
            $service = new $serviceClass($this->client);

            $event = $service->events->get('primary', $eventId);

            if (isset($eventData['title'])) {
                $event->setSummary($eventData['title']);
            }
            if (isset($eventData['description'])) {
                $event->setDescription($eventData['description']);
            }
            if (isset($eventData['start'])) {
                if (!class_exists($eventDateTimeClass)) { throw new Exception('Clase Google_Service_Calendar_EventDateTime no disponible'); }
                $start = new $eventDateTimeClass();
                $start->setDateTime($eventData['start']);
                $start->setTimeZone(TIMEZONE);
                $event->setStart($start);
            }
            if (isset($eventData['end'])) {
                $end = new $eventDateTimeClass();
                $end->setDateTime($eventData['end']);
                $end->setTimeZone(TIMEZONE);
                $event->setEnd($end);
            }

            $service->events->update('primary', $eventId, $event);

            return true;

        } catch (Exception $e) {
            error_log("Error al actualizar evento: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Eliminar evento
     */
    public function deleteEvent($eventId) {
        try {
            $serviceClass = 'Google_Service_' . 'Calendar';
            if (!class_exists($serviceClass)) { throw new Exception('Clase Google_Service_Calendar no disponible'); }
            $service = new $serviceClass($this->client);
            $service->events->delete('primary', $eventId);
            return true;

        } catch (Exception $e) {
            error_log("Error al eliminar evento: {$e->getMessage()}");
            return false;
        }
    }
}
