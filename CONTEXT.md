# CONTEXT.md — Base de Arquitetura: Controle de Reversão de Motor (K1/K2)

> **Instruções de Uso:**
> Este arquivo serve como o Documento de Arquitetura e Contexto Técnico do projeto para balizar o desenvolvimento.

---

## 1. Visão Geral do Projeto

O **Controle de Reversão de Motor** é uma plataforma interativa de controle, monitoramento e supervisão (IHM) focada na automação e em comandos elétricos didáticos ou industriais.

* **Objetivo Principal:** Controlar remotamente uma montagem física com dois relés 5V (K1 e K2) para realizar a partida e a reversão de giro de um motor, garantindo o intertravamento e o desligamento seguro na transição de sentidos.
* **Público/Ambiente:** Laboratório didático com **12 bancadas identificadas de A até L**, prototipagem acadêmica e automação básica.
* **Tipo de Carga/Atuação:** Motor **trifásico** com reversão por inversão de duas fases (contatoras K1/K2 comandadas pelos relés 5V).
* **Acesso do aluno:** cada bancada possui um **QR Code** que abre a IHM de controle daquela bancada (`/controle/[A-L]`).

---

## 2. Topologia e Arquitetura de Comunicação

```text
[Smartphone do aluno] ── lê o QR Code da bancada X ──► /controle/X
              │ (HTTPS / WSS - Sync via Firebase)
              ▼
    [Next.js App (Nuvem)] ◄──► [Firebase Realtime Database]  bancadas/X/...
                                                ▲
                                                │ (Sync OnValue)
                                                ▼
                             [Navegador Host na Bancada X]  /bancada/X
                                                │ (Web Serial API - 115200 baud)
                                                ▼
                                       [Arduino da Bancada X]
                                                │ (Sinais Lógicos 5V)
                                                ▼
                         [Relés K1 e K2] ──► [Contatoras] ──► MOTOR 3~
```

### Rotas da aplicação

| Rota | Onde abrir | Função |
|------|-----------|--------|
| `/` | Computador do instrutor | Painel geral das 12 bancadas (status em tempo real + QR Codes) |
| `/qrcodes` | Computador do instrutor | Folha A4 para imprimir os 12 QR Codes |
| `/bancada/[A-L]` | PC da bancada (USB no Arduino) | Ponte Web Serial ↔ Firebase, QR Code em destaque, comandos locais |
| `/controle/[A-L]` | Celular do aluno (via QR Code) | IHM mobile-first: Direita (K1), Esquerda (K2), PARAR, Emergência |

---

## 3. Especificação do Acionamento e Cargas

### 3.1. Condições de Bloqueio/Intertravamento (CRÍTICO)

* Relé K1 (Sentido 1) e Relé K2 (Sentido 2) **jamais** podem estar acionados simultaneamente (no motor trifásico isso causa **curto fase-fase**).
* Para inverter o sentido de giro, o motor deve ser **parado primeiro** e só pode ser religado após o **tempo morto** (inércia):
  * Firmware: `TEMPO_MORTO_MS = 1500` (recusa com `ERR:DEADTIME`).
  * IHM: `TRANSITION_MS = 2000` (botões bloqueados com contagem regressiva).
* O botão de Emergência corta todas as saídas instantaneamente e **trava** o sistema até o rearme (`CMD:RESET`).
* Recomenda-se intertravamento **elétrico** adicional nas contatoras (contato NF de K2 em série com a bobina de K1 e vice-versa).

### 3.2. Mapeamento de Hardware e Pinagem

| Pino Arduino | Tipo | Função / Conexão | Lógica de Ativação |
|---|---|---|---|
| D7 | Saída Digital | Relé K1 (Motor Sentido Horário) | Active LOW (0V ligar, 5V desligar) |
| D8 | Saída Digital | Relé K2 (Motor Sentido Anti-horário) | Active LOW (0V ligar, 5V desligar) |
| D2 | Entrada Digital | Botão Físico de Emergência / Parada | INPUT_PULLUP (Ativo em 0V) |

---

## 4. Protocolo de Comunicação Serial (115200 bps)

### 4.1. Comandos enviados ao Arduino (Web → MCU)

| Comando | Efeito |
|---|---|
| `CMD:K1_ON\n` | Liga o K1 (apenas se K2 estiver desligado e fora do tempo morto) |
| `CMD:K2_ON\n` | Liga o K2 (apenas se K1 estiver desligado e fora do tempo morto) |
| `CMD:OFF\n` | Desliga imediatamente K1 e K2 |
| `CMD:EMERGENCY\n` | Trava de emergência, corta saídas |
| `CMD:RESET\n` | Rearma após emergência (botão físico precisa estar solto) |
| `CMD:PING\n` | Watchdog de conexão (enviado a cada 1 segundo; timeout de 3 s) |

### 4.2. Respostas do Arduino (MCU → Web)

| Resposta | Significado |
|---|---|
| `STATE:IDLE` | Ambos desligados |
| `STATE:K1_RUNNING` | K1 ligado, motor no sentido horário |
| `STATE:K2_RUNNING` | K2 ligado, motor no sentido anti-horário |
| `STATE:EMERGENCY` | Emergência travada |
| `ERR:INTERLOCK` | Tentativa de ligar K1 e K2 juntos bloqueada |
| `ERR:DEADTIME` | Tentativa de religar antes do tempo morto |
| `ERR:WATCHDOG` | Sem `CMD:PING` por mais de 3 s — saídas desligadas |
| `ERR:EMERGENCY` | Comando recusado: emergência ativa |
| `ERR:UNKNOWN` | Comando desconhecido |

O Arduino responde a cada `CMD:PING` com o `STATE:` atual (heartbeat).

---

## 5. Estrutura do Firebase (Realtime Database)

```json
{
  "bancadas": {
    "A": {
      "device": {
        "status": "online | offline",
        "currentState": "IDLE | K1_RUNNING | K2_RUNNING | EMERGENCY",
        "telemetry": {
          "k1Active": false,
          "k2Active": false,
          "lastCommand": "CMD:OFF",
          "lastError": "INTERLOCK",
          "errorAt": 1728250000000,
          "updatedAt": 1728250000000
        }
      },
      "commandQueue": {
        "action": "K1_ON | K2_ON | OFF | EMERGENCY | RESET",
        "timestamp": 1728250000000,
        "nonce": "lx3k9a-4f8s2k1p"
      }
    },
    "B": { "...": "..." },
    "L": { "...": "..." }
  }
}
```

* `nonce` permite reenviar a mesma ação (ex.: dois `OFF` seguidos).
* Comandos com mais de 5 s de atraso são descartados pela estação (exceto `OFF`/`EMERGENCY`).
* `status` usa `onDisconnect()` — se a aba da bancada fechar, o servidor marca `offline`.