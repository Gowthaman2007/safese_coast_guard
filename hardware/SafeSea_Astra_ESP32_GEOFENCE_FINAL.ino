#include <Arduino.h>
#include <TinyGPSPlus.h>

// ================= SAFESEA ASTRA — FINAL ESP32 ALARM FIRMWARE =================
// GPS: Neo-6M
// USB/Web Serial: 115200 baud
// GPS UART2: 9600 baud
//
// Alarm logic expected from dashboard:
// SAFE        -> LED OFF, buzzer OFF
// WARNING     -> LED pulse once every 5 seconds, buzzer OFF
// CRITICAL    -> LED pattern + one short beep every 2 seconds
// REACHED     -> rapid LED + rapid buzzer
//
// Physical emergency switch always has priority.
// RESET_ALARM never clears a physically-held emergency switch.

#define GPS_RX_PIN       18  // ESP32 RX2 <- Neo-6M TX
#define GPS_TX_PIN       19  // ESP32 TX2 -> Neo-6M RX
#define LED_PIN          23
#define BUZZER_PIN       21
#define EMERGENCY_PIN    22  // switch to GND; INPUT_PULLUP
#define USB_BAUD         115200
#define GPS_BAUD         9600

TinyGPSPlus gps;
HardwareSerial GPSSerial(2);

enum AlarmLevel {
  LEVEL_SAFE,
  LEVEL_WARNING,
  LEVEL_CRITICAL,
  LEVEL_RAPID
};

AlarmLevel dashboardLevel = LEVEL_SAFE;
bool dashboardEmergency = false;
bool physicalEmergency = false;

bool ledState = false;
bool buzzerState = false;
unsigned long patternStarted = 0;
unsigned long lastGpsReport = 0;
unsigned long lastEmergencySample = 0;
bool lastRawEmergency = false;
bool stableEmergency = false;

void setOutputs(bool ledOn, bool buzzerOn) {
  ledState = ledOn;
  buzzerState = buzzerOn;
  digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
  digitalWrite(BUZZER_PIN, buzzerOn ? HIGH : LOW);
}

const char* levelName(AlarmLevel level) {
  switch (level) {
    case LEVEL_WARNING: return "WARNING";
    case LEVEL_CRITICAL: return "CRITICAL";
    case LEVEL_RAPID: return "RAPID_ALARM";
    default: return "SAFE";
  }
}

AlarmLevel effectiveLevel() {
  if (physicalEmergency || dashboardEmergency) return LEVEL_RAPID;
  return dashboardLevel;
}

void printState() {
  Serial.print("STATE,");
  Serial.print(levelName(effectiveLevel()));
  Serial.print(",PHYSICAL_EMERGENCY=");
  Serial.print(physicalEmergency ? "ON" : "OFF");
  Serial.print(",DASHBOARD_EMERGENCY=");
  Serial.println(dashboardEmergency ? "ON" : "OFF");
}

void applyCommand(const String &cmd) {
  if (cmd == "ALERT,SAFE") {
    dashboardLevel = LEVEL_SAFE;
  } else if (cmd == "ALERT,WARNING") {
    dashboardLevel = LEVEL_WARNING;
  } else if (cmd == "ALERT,CRITICAL") {
    dashboardLevel = LEVEL_CRITICAL;
  } else if (cmd == "ALERT,REACHED") {
    dashboardLevel = LEVEL_RAPID;
  } else if (cmd == "EMERGENCY,ON") {
    dashboardEmergency = true;
  } else if (cmd == "EMERGENCY,OFF") {
    dashboardEmergency = false;
  } else if (cmd == "RESET_ALARM") {
    // Deliberately does NOT clear physicalEmergency.
    dashboardEmergency = false;
    dashboardLevel = LEVEL_SAFE;
    Serial.println("ACK,ALARM_RESET");
  } else if (cmd == "TEST,LED") {
    setOutputs(true, false);
    delay(180);
    setOutputs(false, false);
    Serial.println("ACK,LED_OK");
    patternStarted = millis();
    return;
  } else if (cmd == "TEST,BUZZER") {
    setOutputs(false, true);
    delay(180);
    setOutputs(false, false);
    Serial.println("ACK,BUZZER_OK");
    patternStarted = millis();
    return;
  } else if (cmd == "TEST,ALARM") {
    for (int i = 0; i < 4; i++) {
      setOutputs(true, true);
      delay(100);
      setOutputs(false, false);
      delay(100);
    }
    Serial.println("ACK,ALARM_ACTIVE");
    patternStarted = millis();
    return;
  } else {
    return;
  }

  patternStarted = millis();
  printState();
}

void readUsbCommands() {
  static String line;
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      line.trim();
      if (line.length()) applyCommand(line);
      line = "";
    } else if (line.length() < 80) {
      line += c;
    }
  }
}

void updatePhysicalEmergency() {
  unsigned long now = millis();
  if (now - lastEmergencySample < 25) return;
  lastEmergencySample = now;

  bool raw = (digitalRead(EMERGENCY_PIN) == LOW);
  if (raw != lastRawEmergency) {
    lastRawEmergency = raw;
    patternStarted = now;
  }

  static unsigned long stableSince = 0;
  if (raw != stableEmergency) {
    if (stableSince == 0) stableSince = now;
    if (now - stableSince >= 60) {
      stableEmergency = raw;
      physicalEmergency = stableEmergency;
      Serial.print("EMERGENCY,");
      Serial.println(physicalEmergency ? "ON" : "OFF");
      printState();
      stableSince = 0;
      patternStarted = now;
    }
  } else {
    stableSince = 0;
  }
}

void updateAlarmOutputs() {
  const unsigned long now = millis();
  const AlarmLevel level = effectiveLevel();
  const unsigned long elapsed = now - patternStarted;

  if (level == LEVEL_SAFE) {
    setOutputs(false, false);
    return;
  }

  if (level == LEVEL_WARNING) {
    // One short LED pulse every 5 seconds. No buzzer.
    const unsigned long phase = elapsed % 5000UL;
    setOutputs(phase < 180UL, false);
    return;
  }

  if (level == LEVEL_CRITICAL) {
    // One LED/buzzer event every 2 seconds.
    const unsigned long phase = elapsed % 2000UL;
    setOutputs(phase < 300UL, phase < 120UL);
    return;
  }

  // RAPID_ALARM: fast repeating LED + buzzer.
  const unsigned long phase = elapsed % 360UL;
  setOutputs(phase < 180UL, phase < 100UL);
}

void updateGpsReport() {
  const unsigned long now = millis();
  if (now - lastGpsReport < 1000) return;
  lastGpsReport = now;

  if (gps.location.isValid()) {
    Serial.print("GPS,");
    Serial.print(gps.location.lat(), 6);
    Serial.print(",");
    Serial.print(gps.location.lng(), 6);
    Serial.print(",");
    Serial.println(gps.speed.isValid() ? gps.speed.knots() : 0.0, 2);
  } else {
    Serial.println("GPS,NO_FIX");
  }
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(EMERGENCY_PIN, INPUT_PULLUP);
  setOutputs(false, false);

  Serial.begin(USB_BAUD);
  GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  delay(200);
  Serial.println("SAFESEA_ASTRA_READY");
  Serial.println("READY,115200,GPS=9600");
  printState();
}

void loop() {
  while (GPSSerial.available()) {
    gps.encode(GPSSerial.read());
  }

  readUsbCommands();
  updatePhysicalEmergency();
  updateAlarmOutputs();
  updateGpsReport();
}
