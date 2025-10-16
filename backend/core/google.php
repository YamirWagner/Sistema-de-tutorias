<?php
// google.php - Conexión con Google Calendar API

class GoogleCalendar {
    private $client;
    
    public function __construct() {
        $this->client = new Google_Client();
        $this->configure();
    }
    
    /**
     * Configurar cliente de Google
     */
    private function configure() {
        $this->client->setClientId(GOOGLE_CLIENT_ID);
        $this->client->setClientSecret(GOOGLE_CLIENT_SECRET);
        $this->client->setRedirectUri(GOOGLE_REDIRECT_URI);
        $this->client->addScope(Google_Service_Calendar::CALENDAR);
    }
    
    /**
     * Obtener URL de autenticación
     */
    public function getAuthUrl() {
        return $this->client->createAuthUrl();
    }
    
    /**
     * Autenticar con código
     */
    public function authenticate($code) {
        try {
            $token = $this->client->fetchAccessTokenWithAuthCode($code);
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
     * Crear evento en el calendario
     */
    public function createEvent($eventData) {
        try {
            $service = new Google_Service_Calendar($this->client);
            
            $event = new Google_Service_Calendar_Event([
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
            $service = new Google_Service_Calendar($this->client);
            
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
                    'start' => $event->getStart()->getDateTime(),
                    'end' => $event->getEnd()->getDateTime(),
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
            $service = new Google_Service_Calendar($this->client);
            
            $event = $service->events->get('primary', $eventId);
            
            if (isset($eventData['title'])) {
                $event->setSummary($eventData['title']);
            }
            if (isset($eventData['description'])) {
                $event->setDescription($eventData['description']);
            }
            if (isset($eventData['start'])) {
                $start = new Google_Service_Calendar_EventDateTime();
                $start->setDateTime($eventData['start']);
                $start->setTimeZone(TIMEZONE);
                $event->setStart($start);
            }
            if (isset($eventData['end'])) {
                $end = new Google_Service_Calendar_EventDateTime();
                $end->setDateTime($eventData['end']);
                $end->setTimeZone(TIMEZONE);
                $event->setEnd($end);
            }
            
            $updatedEvent = $service->events->update('primary', $eventId, $event);
            
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
            $service = new Google_Service_Calendar($this->client);
            $service->events->delete('primary', $eventId);
            return true;
            
        } catch (Exception $e) {
            error_log("Error al eliminar evento: {$e->getMessage()}");
            return false;
        }
    }
}
