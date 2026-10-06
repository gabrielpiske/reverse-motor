import { RotateCcw, RotateCw } from 'lucide-react';
import { STATE_LABEL } from '@/lib/constants';
import type { MotorState } from '@/lib/types';

interface Props {
  state: MotorState;
  online: boolean;
}

function Lamp({ on, color, label, sub }: { on: boolean; color: 'green' | 'blue'; label: string; sub: string }) {
  const onClass =
    color === 'green'
      ? 'bg-emerald-400 shadow-[0_0_24px_6px_rgba(52,211,153,0.6)]'
      : 'bg-sky-400 shadow-[0_0_24px_6px_rgba(56,189,248,0.6)]';
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`h-14 w-14 rounded-full border-4 border-slate-700 transition-all ${on ? onClass : 'bg-slate-800'}`}
        aria-label={`${label} ${on ? 'acionado' : 'desligado'}`}
      />
      <span className="text-sm font-bold">{label}</span>
      <span className="text-xs text-slate-400">{sub}</span>
    </div>
  );
}

/** Painel de sinalização: lâmpadas de K1/K2 e estado atual do motor. */
export default function MotorStatusPanel({ state, online }: Props) {
  const k1 = online && state === 'K1_RUNNING';
  const k2 = online && state === 'K2_RUNNING';
  const emergency = online && state === 'EMERGENCY';

  return (
    <div
      className={`rounded-2xl border p-5 ${
        emergency ? 'animate-pulse border-red-500 bg-red-950/60' : 'border-slate-700 bg-slate-900/70'
      }`}
    >
      <div className="flex items-center justify-around">
        <Lamp on={k1} color="green" label="K1" sub="Direita" />
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-slate-600">
          {k1 && <RotateCw className="h-12 w-12 animate-spin text-emerald-400 [animation-duration:1.2s]" />}
          {k2 && (
            <RotateCcw className="h-12 w-12 animate-spin text-sky-400 [animation-direction:reverse] [animation-duration:1.2s]" />
          )}
          {!k1 && !k2 && <span className="text-xs font-bold text-slate-500">M 3~</span>}
        </div>
        <Lamp on={k2} color="blue" label="K2" sub="Esquerda" />
      </div>
      <p className={`mt-4 text-center text-lg font-bold ${emergency ? 'text-red-300' : ''}`}>
        {online ? STATE_LABEL[state] : 'Bancada offline'}
      </p>
    </div>
  );
}
