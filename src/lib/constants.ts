import type { MotorState } from './types';

/** Velocidade da porta serial (deve ser igual ao firmware). */
export const BAUD_RATE = 115200;

/** Intervalo do CMD:PING enviado ao Arduino (watchdog do firmware = 3000 ms). */
export const PING_INTERVAL_MS = 1000;

/**
 * Tempo que a IHM bloqueia nova partida após o motor parar (inércia).
 * Deve ser MAIOR que TEMPO_MORTO_MS do firmware (1500 ms).
 */
export const TRANSITION_MS = 2000;

/** Comandos mais antigos que isso (ex.: enviados com a bancada offline) são descartados. */
export const COMMAND_MAX_AGE_MS = 5000;

export const STATE_LABEL: Record<MotorState, string> = {
  IDLE: 'Motor parado',
  K1_RUNNING: 'Girando à DIREITA (horário)',
  K2_RUNNING: 'Girando à ESQUERDA (anti-horário)',
  EMERGENCY: 'EMERGÊNCIA ACIONADA',
};

export const ERROR_MESSAGE: Record<string, string> = {
  INTERLOCK: 'Intertravamento: pare o motor antes de inverter o sentido.',
  DEADTIME: 'Aguarde o motor parar completamente antes de religar.',
  WATCHDOG: 'Comunicação com a bancada interrompida — motor desligado por segurança.',
  EMERGENCY: 'Emergência ativa. Solte o botão físico e rearme o sistema.',
  UNKNOWN: 'Comando não reconhecido pelo Arduino.',
  CLOUD_LOST: 'A bancada perdeu a conexão com a nuvem — motor desligado por segurança.',
};
