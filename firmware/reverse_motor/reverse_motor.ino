/*
 * ============================================================================
 *  Partida e Reversão de Motor Trifásico — Firmware da Bancada (K1 / K2)
 * ============================================================================
 *  Placa:      Arduino Uno / Nano / Mega
 *  Serial:     115200 bps, mensagens terminadas em '\n'
 *
 *  Pinagem:
 *    D7  -> Relé K1 (sentido horário / direita)       Active LOW
 *    D8  -> Relé K2 (sentido anti-horário / esquerda)  Active LOW
 *    D2  -> Botão físico de Emergência/Parada          INPUT_PULLUP (ativo em 0V)
 *
 *  Comandos recebidos (Web -> MCU):
 *    CMD:K1_ON      Liga K1 (somente se K2 estiver desligado)
 *    CMD:K2_ON      Liga K2 (somente se K1 estiver desligado)
 *    CMD:OFF        Desliga K1 e K2 imediatamente
 *    CMD:EMERGENCY  Trava de emergência (corta tudo e permanece travado)
 *    CMD:RESET      Rearma após emergência (botão físico precisa estar solto)
 *    CMD:PING       Watchdog de conexão (enviado a cada 1 s pela página /bancada)
 *
 *  Respostas (MCU -> Web):
 *    STATE:IDLE | STATE:K1_RUNNING | STATE:K2_RUNNING | STATE:EMERGENCY
 *    ERR:INTERLOCK  Tentativa de ligar K1 e K2 juntos (bloqueada)
 *    ERR:DEADTIME   Tentativa de religar antes do tempo morto de parada
 *    ERR:WATCHDOG   Sem PING por mais de 3 s (saídas desligadas)
 *    ERR:EMERGENCY  Comando recusado: emergência ativa
 *    ERR:UNKNOWN    Comando desconhecido
 *
 *  SEGURANÇA: K1 e K2 NUNCA podem ficar acionados ao mesmo tempo. Em um motor
 *  trifásico isso inverte duas fases com a rede energizada = CURTO FASE-FASE.
 *  Este firmware é a última barreira de software. Recomenda-se ainda o
 *  intertravamento ELÉTRICO (contato NF de K2 em série com a bobina de K1 e
 *  vice-versa) nas contatoras de potência.
 * ============================================================================
 */

// ---------------------------- Pinagem ---------------------------------------
const uint8_t PIN_K1          = 7;
const uint8_t PIN_K2          = 8;
const uint8_t PIN_EMERGENCIA  = 2;

// Módulo relé Active LOW: LOW liga, HIGH desliga.
const uint8_t RELE_ON  = LOW;
const uint8_t RELE_OFF = HIGH;

// ---------------------------- Tempos ----------------------------------------
const unsigned long BAUD_RATE           = 115200;
const unsigned long WATCHDOG_TIMEOUT_MS = 3000;  // sem PING -> desliga tudo
const unsigned long TEMPO_MORTO_MS      = 1500;  // espera mínima após parar (inércia do motor)

// ---------------------------- Máquina de estados ----------------------------
enum MotorState : uint8_t { IDLE, K1_RUNNING, K2_RUNNING, EMERGENCY };

MotorState    estado             = IDLE;
unsigned long ultimoPing         = 0;
unsigned long instanteParada     = 0;     // millis() do último desligamento de um sentido
bool          watchdogExpirado   = true;  // só aceita partida depois do 1º PING

// Buffer de recepção serial
const uint8_t TAM_BUFFER = 32;
char          bufferRx[TAM_BUFFER];
uint8_t       posRx = 0;
bool          descartandoLinha = false;

// ============================================================================
//  Saídas — ÚNICO ponto do código que escreve nos relés.
//  Sempre desliga primeiro o relé oposto e só depois liga o desejado.
// ============================================================================
void aplicarSaidas() {
  switch (estado) {
    case K1_RUNNING:
      digitalWrite(PIN_K2, RELE_OFF);
      digitalWrite(PIN_K1, RELE_ON);
      break;
    case K2_RUNNING:
      digitalWrite(PIN_K1, RELE_OFF);
      digitalWrite(PIN_K2, RELE_ON);
      break;
    default:  // IDLE e EMERGENCY
      digitalWrite(PIN_K1, RELE_OFF);
      digitalWrite(PIN_K2, RELE_OFF);
      break;
  }
}

const char* nomeEstado(MotorState s) {
  switch (s) {
    case K1_RUNNING: return "K1_RUNNING";
    case K2_RUNNING: return "K2_RUNNING";
    case EMERGENCY:  return "EMERGENCY";
    default:         return "IDLE";
  }
}

void reportarEstado() {
  Serial.print(F("STATE:"));
  Serial.println(nomeEstado(estado));
}

void reportarErro(const __FlashStringHelper* codigo) {
  Serial.print(F("ERR:"));
  Serial.println(codigo);
}

void mudarEstado(MotorState novo) {
  if (novo == estado) return;
  bool estavaGirando = (estado == K1_RUNNING || estado == K2_RUNNING);
  estado = novo;
  aplicarSaidas();
  if (estavaGirando && (novo == IDLE || novo == EMERGENCY)) {
    instanteParada = millis();
  }
  reportarEstado();
}

// ============================================================================
//  Ações
// ============================================================================
void desligar() {
  if (estado == EMERGENCY) {  // OFF não destrava a emergência
    aplicarSaidas();
    reportarEstado();
    return;
  }
  mudarEstado(IDLE);
  aplicarSaidas();  // redundância intencional
}

void entrarEmergencia() {
  if (estado != EMERGENCY) {
    mudarEstado(EMERGENCY);
  }
  aplicarSaidas();
}

void rearmar() {
  if (estado != EMERGENCY) {
    reportarEstado();
    return;
  }
  if (digitalRead(PIN_EMERGENCIA) == LOW) {  // botão físico ainda pressionado
    reportarErro(F("EMERGENCY"));
    reportarEstado();
    return;
  }
  mudarEstado(IDLE);
}

void ligar(MotorState sentido) {
  const uint8_t pinoOposto      = (sentido == K1_RUNNING) ? PIN_K2 : PIN_K1;
  const MotorState estadoOposto = (sentido == K1_RUNNING) ? K2_RUNNING : K1_RUNNING;

  if (estado == EMERGENCY) {
    reportarErro(F("EMERGENCY"));
    reportarEstado();
    return;
  }
  if (watchdogExpirado) {
    reportarErro(F("WATCHDOG"));
    reportarEstado();
    return;
  }
  // INTERTRAVAMENTO: verifica o estado lógico E o nível real do pino oposto.
  if (estado == estadoOposto || digitalRead(pinoOposto) == RELE_ON) {
    reportarErro(F("INTERLOCK"));
    reportarEstado();
    return;
  }
  if (estado == sentido) {  // já está girando nesse sentido
    reportarEstado();
    return;
  }
  if (instanteParada != 0 && (millis() - instanteParada) < TEMPO_MORTO_MS) {
    reportarErro(F("DEADTIME"));
    reportarEstado();
    return;
  }
  mudarEstado(sentido);
}

// ============================================================================
//  Protocolo serial
// ============================================================================
void processarComando(const char* linha) {
  if (strcmp(linha, "CMD:PING") == 0) {
    ultimoPing = millis();
    watchdogExpirado = false;
    reportarEstado();  // heartbeat: a página sempre sabe o estado real
  } else if (strcmp(linha, "CMD:K1_ON") == 0) {
    ligar(K1_RUNNING);
  } else if (strcmp(linha, "CMD:K2_ON") == 0) {
    ligar(K2_RUNNING);
  } else if (strcmp(linha, "CMD:OFF") == 0) {
    desligar();
  } else if (strcmp(linha, "CMD:EMERGENCY") == 0) {
    entrarEmergencia();
  } else if (strcmp(linha, "CMD:RESET") == 0) {
    rearmar();
  } else {
    reportarErro(F("UNKNOWN"));
  }
}

void lerSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      if (!descartandoLinha && posRx > 0) {
        bufferRx[posRx] = '\0';
        processarComando(bufferRx);
      }
      posRx = 0;
      descartandoLinha = false;
      continue;
    }
    if (posRx < TAM_BUFFER - 1) {
      bufferRx[posRx++] = c;
    } else {
      descartandoLinha = true;  // linha longa demais: descarta até o próximo '\n'
    }
  }
}

// ============================================================================
//  Proteções contínuas
// ============================================================================
void verificarBotaoEmergencia() {
  // Ação imediata, sem debounce: na dúvida, desliga.
  if (digitalRead(PIN_EMERGENCIA) == LOW) {
    entrarEmergencia();
  }
}

void verificarWatchdog() {
  if (!watchdogExpirado && (millis() - ultimoPing) > WATCHDOG_TIMEOUT_MS) {
    watchdogExpirado = true;
    digitalWrite(PIN_K1, RELE_OFF);
    digitalWrite(PIN_K2, RELE_OFF);
    if (estado == K1_RUNNING || estado == K2_RUNNING) {
      mudarEstado(IDLE);
    }
    reportarErro(F("WATCHDOG"));
  }
}

// ============================================================================
void setup() {
  // Escreve HIGH ANTES e DEPOIS do pinMode para o relé nunca pulsar no boot.
  digitalWrite(PIN_K1, RELE_OFF);
  digitalWrite(PIN_K2, RELE_OFF);
  pinMode(PIN_K1, OUTPUT);
  pinMode(PIN_K2, OUTPUT);
  digitalWrite(PIN_K1, RELE_OFF);
  digitalWrite(PIN_K2, RELE_OFF);

  pinMode(PIN_EMERGENCIA, INPUT_PULLUP);

  Serial.begin(BAUD_RATE);
  estado = IDLE;
  aplicarSaidas();
  Serial.println(F("READY"));
  reportarEstado();
}

void loop() {
  verificarBotaoEmergencia();
  lerSerial();
  verificarWatchdog();
  aplicarSaidas();  // reafirma as saídas a cada ciclo (garante K1 e K2 nunca juntos)
}
