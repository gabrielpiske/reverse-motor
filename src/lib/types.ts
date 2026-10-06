export type MotorState = 'IDLE' | 'K1_RUNNING' | 'K2_RUNNING' | 'EMERGENCY';

export type MotorAction = 'K1_ON' | 'K2_ON' | 'OFF' | 'EMERGENCY' | 'RESET';

export type DeviceStatus = 'online' | 'offline';

export type FirmwareError = 'INTERLOCK' | 'DEADTIME' | 'WATCHDOG' | 'EMERGENCY' | 'UNKNOWN' | 'CLOUD_LOST';

export interface Telemetry {
  k1Active: boolean;
  k2Active: boolean;
  lastCommand?: string;
  lastError?: string | null;
  errorAt?: number;
  updatedAt?: number;
}

export interface DeviceData {
  status: DeviceStatus;
  currentState: MotorState;
  telemetry?: Telemetry;
}

export interface CommandData {
  action: MotorAction;
  timestamp: number;
  nonce: string;
}

export interface BancadaData {
  device?: DeviceData;
  commandQueue?: CommandData;
}

const MOTOR_STATES: readonly MotorState[] = ['IDLE', 'K1_RUNNING', 'K2_RUNNING', 'EMERGENCY'];
const MOTOR_ACTIONS: readonly MotorAction[] = ['K1_ON', 'K2_ON', 'OFF', 'EMERGENCY', 'RESET'];

export function isMotorState(value: unknown): value is MotorState {
  return typeof value === 'string' && (MOTOR_STATES as readonly string[]).includes(value);
}

export function isMotorAction(value: unknown): value is MotorAction {
  return typeof value === 'string' && (MOTOR_ACTIONS as readonly string[]).includes(value);
}
