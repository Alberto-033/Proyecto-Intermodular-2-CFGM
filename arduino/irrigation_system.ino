/**
 * ==================================================================================
 *               SISTEMA DE RIEGO INTELIGENTE Y AUTOMÁTICO CON ARDUINO
 * ==================================================================================
 * Este sketch está diseñado para una placa microcontroladora con soporte Wi-Fi 
 * (como un ESP32 o ESP8266) conectada al panel de control web.
 * 
 * HARDWARE RECOMENDADO:
 * - Placa ESP32 o ESP8266.
 * - Sensor de Humedad de Suelo Higrómetro (Pin Analógico A0).
 * - Sensor de Temperatura y Humedad DHT22 o DHT11 (Pin Digital 4).
 * - Módulo de Relé de 5V/3.3V para Electroválvula de Riego (Pin Digital 13 / LED incorporado).
 * 
 * LIBRERÍAS REQUERIDAS:
 * - ArduinoJson (de Benoit Blanchon) -> Para parsear datos REST y Websockets.
 * - WebSocketsClient (de Markus Sattler) -> Para actualizaciones en tiempo real.
 * ==================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// Configuración de la red Wi-Fi local
const char* ssid = "TU_SSID_WIFI";
const char* password = "TU_CONTRASEÑA_WIFI";

// Dirección IP local y puerto de tu servidor backend de Node.js
const char* serverIP = "192.168.1.100"; // Reemplaza con la IP local de tu ordenador
const int serverPort = 3001;

// Token de seguridad UUID copiado desde tu Ajustes en el Panel Web
const char* authToken = "TU_UUID_DE_USUARIO_AQUÍ";

// Asignación de pines de hardware
const int moisturePin = 34; // A0 analógico en ESP32
const int relayPin = 13;    // Pin 13 controla el Relé (LED azul de la placa)

// Clientes y variables globales
WebSocketsClient webSocket;
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 10000; // Enviar lecturas cada 10 segundos

// Manejador de eventos de WebSocket (Lectura de comandos de riego en directo)
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Desconectado del panel central de riego.");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] ¡Conectado al servidor WebSocket correctamente!");
      break;
    case WStype_TEXT: {
      Serial.printf("[WS] Mensaje recibido: %s\n", payload);
      
      // Parsear el JSON recibido
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (error) {
        Serial.print(F("Fallo al parsear JSON: "));
        Serial.println(error.f_str());
        return;
      }
      
      const char* messageType = doc["type"];
      if (strcmp(messageType, "status_update") == 0) {
        // Extraer el estado de la electroválvula mandado por el servidor
        bool valveState = doc["payload"]["valveState"];
        
        if (valveState) {
          digitalWrite(relayPin, HIGH); // Abrir paso de agua
          Serial.println("[Relé] Electroválvula ABIERTA - Regando... 💧");
        } else {
          digitalWrite(relayPin, LOW);  // Cerrar paso de agua
          Serial.println("[Relé] Electroválvula CERRADA - Detenido. ❌");
        }
      }
      break;
    }
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  
  // Configurar pines
  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW); // Apagado por seguridad al iniciar

  // Conexión a la red Wi-Fi
  Serial.printf("\nConectando a red Wi-Fi %s ", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n¡Wi-Fi Conectado!");
  Serial.print("Dirección IP local del Arduino: ");
  Serial.println(WiFi.localIP());

  // Inicializar WebSocket con el servidor del backend
  webSocket.begin(serverIP, serverPort, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000); // Reintentar cada 5s si se pierde enlace
}

void loop() {
  webSocket.loop();
  
  unsigned long now = millis();
  if (now - lastSendTime >= sendInterval) {
    lastSendTime = now;
    
    // 1. Leer el sensor de humedad analógico físico
    int rawMoisture = analogRead(moisturePin);
    // Mapear la lectura analógica (ej. 4095 seco, 1500 mojado en ESP32) a porcentaje 0%-100%
    int moisturePercent = map(rawMoisture, 4095, 1500, 0, 100);
    moisturePercent = constrain(moisturePercent, 0, 100); // Limitar entre 0 y 100

    // 2. Simular o leer temperatura ambiente
    float temperature = 24.5 + (random(-20, 20) / 10.0); // Simulación de temperatura oscilante

    Serial.printf("[Sensores] Enviando humedad: %d%%, Temperatura: %.1f°C\n", moisturePercent, temperature);

    // 3. Crear el JSON de datos de sensores para mandar al WebSocket
    StaticJsonDocument<256> doc;
    doc["type"] = "sensor_data";
    
    JsonObject payload = doc.createNestedObject("payload");
    payload["moisture"] = moisturePercent;
    payload["temperature"] = temperature;

    String jsonString;
    serializeJson(doc, jsonString);
    
    // Mandar lecturas en tiempo real al WebSocket de la aplicación web
    webSocket.sendTXT(jsonString);
  }
}
