'use client';

import { OctagonX, RefreshCcw, RotateCcw, RotateCw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import FirebaseConfigWarning from '@/components/FirebaseConfigWarning';
import MotorStatusPanel from '@/components/MotorStatusPanel';
import StatusBadge from '@/components/StatusBadge';
import { useBancada } from '@/hooks/useBancada';
import type { BancadaId } from '@/lib/bancadas';
import { ERROR_MESSAGE, TRANSITION_MS } from '@/lib/constants';
import { sendCommand } from '@/lib/firebase';
import type { MotorAction, MotorState } from '@/lib/types';

/** IHM mobile-first do aluno (acessada pelo QR Code da bancada). */
export default function ControlePanel({ id }: { id: BancadaId }) {
  const { data, loading, error } = useBancada(id);
  const device = data?.device;
  const online = device?.status === 'online';
  const state: MotorState = device?.currentState ?? 'IDLE';
  const errorAt = device?.telemetry?.errorAt;
  const lastError = device?.telemetry?.lastError;

  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(0);

  // Bloqueio de transição: após o motor parar, aguarda TRANSITION_MS (inércia) antes de religar.
  const prevStateRef = useRef<MotorState | null>(null);
  useEffect(() => {
    const prev = prevStateRef.current;
    if ((prev === 'K1_RUNNING' || prev === 'K2_RUNNING') && state !== prev) {
      setLockUntil(Date.now() + TRANSITION_MS);
    }
    prevStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (lockUntil === 0) return;
    setNow(Date.now());
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockUntil) clearInterval(t);
    }, 100);
    return () => clearInterval(t);
  }, [lockUntil]);

  const lockRemaining = Math.max(0, lockUntil - now);

  // Exibe erros do firmware/bancada (ignora o erro antigo já existente ao abrir a página).
  const seenErrorAtRef = useRef<number | undefined>(undefined);
  const errorsInitRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!errorsInitRef.current) {
      errorsInitRef.current = true;
      seenErrorAtRef.current = errorAt;
      return;
    }
    if (errorAt && errorAt !== seenErrorAtRef.current) {
      seenErrorAtRef.current = errorAt;
      setToast(ERROR_MESSAGE[lastError ?? ''] ?? `Erro: ${lastError}`);
    }
  }, [loading, errorAt, lastError]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  async function send(action: MotorAction) {
    setSending(true);
    try {
      navigator.vibrate?.(40);
      await sendCommand(id, action);
    } catch (err) {
      setToast(`Falha ao enviar comando: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  }

  const emergency = state === 'EMERGENCY';
  const running = state === 'K1_RUNNING' || state === 'K2_RUNNING';
  // Intertravamento na IHM: só parte com o motor PARADO e após o tempo de transição.
  const canStart = online && !sending && state === 'IDLE' && lockRemaining === 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4 pb-8">
      <FirebaseConfigWarning />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-3xl font-black text-slate-950">
            {id}
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Bancada {id}</h1>
            <p className="text-xs text-slate-400">Partida e reversão — Motor 3~</p>
          </div>
        </div>
        <StatusBadge ok={online} okLabel="Online" failLabel={loading ? 'Carregando' : 'Offline'} />
      </header>

      {error && <p className="rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}

      <MotorStatusPanel state={state} online={online} />

      {!online && !loading && (
        <p className="rounded-lg bg-slate-800 p-3 text-center text-sm text-slate-300">
          A estação desta bancada está desligada. Peça ao instrutor para conectar o Arduino.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => void send('K1_ON')}
          disabled={!canStart}
          className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-6 font-bold shadow-lg transition active:scale-95 enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <RotateCw className="h-10 w-10" />
          <span>Girar Direita</span>
          <span className="text-xs font-normal opacity-80">K1</span>
        </button>
        <button
          onClick={() => void send('K2_ON')}
          disabled={!canStart}
          className="flex flex-col items-center gap-2 rounded-2xl bg-sky-600 px-3 py-6 font-bold shadow-lg transition active:scale-95 enabled:hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <RotateCcw className="h-10 w-10" />
          <span>Girar Esquerda</span>
          <span className="text-xs font-normal opacity-80">K2</span>
        </button>
      </div>

      <p className="min-h-5 text-center text-sm text-amber-300">
        {online && running && 'Para inverter o sentido, pressione PARAR primeiro.'}
        {online && !running && lockRemaining > 0 && `Aguardando o motor parar... ${(lockRemaining / 1000).toFixed(1)} s`}
      </p>

      <button
        onClick={() => void send('OFF')}
        disabled={!online || sending}
        className="flex items-center justify-center gap-3 rounded-full bg-red-600 py-10 text-3xl font-black tracking-wide shadow-[0_0_40px_rgba(220,38,38,0.45)] transition active:scale-95 enabled:hover:bg-red-500 disabled:opacity-30"
      >
        <Square className="h-9 w-9 fill-current" />
        PARAR
      </button>

      {emergency ? (
        <button
          onClick={() => void send('RESET')}
          disabled={!online || sending}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-700 py-4 font-bold transition active:scale-95 disabled:opacity-30"
        >
          <RefreshCcw className="h-5 w-5" /> Rearmar sistema
        </button>
      ) : (
        <button
          onClick={() => void send('EMERGENCY')}
          disabled={!online || sending}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-red-500 bg-red-950/50 py-4 font-bold text-red-300 transition active:scale-95 disabled:opacity-30"
        >
          <OctagonX className="h-5 w-5" /> EMERGÊNCIA
        </button>
      )}

      {toast && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 mx-auto max-w-md rounded-xl border border-amber-500 bg-slate-900 p-4 text-sm text-amber-100 shadow-2xl"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
