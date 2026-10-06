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
      ? 'bg-emerald-400 shadow-[0_0_28px_8px_rgba(52,211,153,0.7)] border-emerald-200 ring-2 ring-emerald-500/50'
      : 'bg-cyan-400 shadow-[0_0_28px_8px_rgba(6,182,212,0.7)] border-cyan-200 ring-2 ring-cyan-500/50';
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`h-14 w-14 rounded-full border-4 transition-all duration-300 ${
          on ? onClass : 'border-slate-700 bg-slate-900/90 shadow-inner'
        }`}
        aria-label={`${label} ${on ? 'acionado' : 'desligado'}`}
      />
      <span className="text-sm font-black tracking-wide text-slate-100">{label}</span>
      <span className="text-[11px] font-medium text-slate-400">{sub}</span>
    </div>
  );
}

/** Painel de sinalização: lâmpadas piloto industriais de K1/K2 e representação do motor trifásico. */
export default function MotorStatusPanel({ state, online }: Props) {
  const k1 = online && state === 'K1_RUNNING';
  const k2 = online && state === 'K2_RUNNING';
  const emergency = online && state === 'EMERGENCY';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 shadow-xl ${
        emergency
          ? 'animate-pulse border-red-500 bg-red-950/70 shadow-red-950/40'
          : 'border-blue-900/50 bg-gradient-to-b from-[#0b1f38]/90 via-[#09172a]/95 to-[#040d1a] shadow-blue-950/30'
      }`}
    >
      <div className="flex items-center justify-around">
        <Lamp on={k1} color="green" label="K1" sub="Horário" />

        <div className="flex flex-col items-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-blue-500/40 bg-slate-950/80 shadow-inner">
            {k1 && <RotateCw className="h-14 w-14 animate-spin text-emerald-400 [animation-duration:1.2s]" />}
            {k2 && (
              <RotateCcw className="h-14 w-14 animate-spin text-cyan-400 [animation-direction:reverse] [animation-duration:1.2s]" />
            )}
            {!k1 && !k2 && (
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-slate-300 tracking-wider">M 3~</span>
                <span className="text-[9px] font-mono text-blue-400">R-S-T</span>
              </div>
            )}
          </div>
          <span className="mt-1 text-[10px] font-mono text-slate-400">Rotor Gaiola</span>
        </div>

        <Lamp on={k2} color="blue" label="K2" sub="Anti-horário" />
      </div>

      <div className="mt-4 rounded-xl border border-blue-950 bg-black/40 p-2.5 text-center">
        <p className={`text-base font-bold ${emergency ? 'text-red-300' : 'text-slate-100'}`}>
          {online ? STATE_LABEL[state] : 'Bancada Desconectada / Offline'}
        </p>
      </div>
    </div>
  );
}
