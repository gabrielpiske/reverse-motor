'use client';

import { OctagonX, RefreshCcw, RotateCcw, RotateCw, Square, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import FirebaseConfigWarning from '@/components/FirebaseConfigWarning';
import MotorStatusPanel from '@/components/MotorStatusPanel';
import StatusBadge from '@/components/StatusBadge';
import { useBancada } from '@/hooks/useBancada';
import type { BancadaId } from '@/lib/bancadas';
import { ERROR_MESSAGE, TRANSITION_MS } from '@/lib/constants';
import { sendCommand } from '@/lib/firebase';
import type { MotorAction, MotorState } from '@/lib/types';

/** IHM mobile-first do aluno com identidade SENAI e autoria educacional de Gabriel Piske. */
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
    <div className="flex min-h-dvh flex-col justify-between bg-gradient-to-b from-[#0c2340] via-[#051329] to-[#020914] text-slate-100">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 pb-6">
        <FirebaseConfigWarning />

        {/* CABEÇALHO SENAI */}
        <header className="flex items-center justify-between rounded-2xl border border-blue-800/40 bg-slate-950/60 p-3 backdrop-blur-md shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#004587] to-[#005caa] text-2xl font-black text-white shadow-md border border-blue-400/30">
              {id}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-[#004587] px-1.5 py-0.2 text-[10px] font-bold text-white tracking-wider">
                  SENAI
                </span>
                <h1 className="text-base font-extrabold text-white">Bancada {id}</h1>
              </div>
              <p className="text-[11px] text-cyan-300 font-medium">Reversão de Motor Trifásico</p>
            </div>
          </div>
          <StatusBadge ok={online} okLabel="Online" failLabel={loading ? 'Conectando...' : 'Offline'} />
        </header>

        {error && <p className="rounded-xl bg-red-950/70 border border-red-500/50 p-3 text-xs text-red-200">{error}</p>}

        <MotorStatusPanel state={state} online={online} />

        {!online && !loading && (
          <div className="rounded-xl border border-blue-900/60 bg-blue-950/40 p-3.5 text-center text-xs text-slate-300">
            A estação desta bancada está offline. Solicite ao docente conectar a bancada ao Arduino USB.
          </div>
        )}

        {/* BOTÕES DE ACIONAMENTO COM INTERTRAVAMENTO */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => void send('K1_ON')}
            disabled={!canStart}
            className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 p-4 font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95 enabled:hover:from-emerald-400 enabled:hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-30 border border-emerald-400/30"
          >
            <RotateCw className="h-9 w-9 text-white" />
            <span className="text-sm">Girar Direita</span>
            <span className="text-[11px] font-mono rounded bg-emerald-900/60 px-2 py-0.5 text-emerald-200">
              K1 (Horário)
            </span>
          </button>

          <button
            onClick={() => void send('K2_ON')}
            disabled={!canStart}
            className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b from-[#005caa] to-[#003882] p-4 font-bold shadow-lg shadow-blue-950/50 transition active:scale-95 enabled:hover:from-[#006bd1] enabled:hover:to-[#004587] disabled:cursor-not-allowed disabled:opacity-30 border border-cyan-400/30"
          >
            <RotateCcw className="h-9 w-9 text-white" />
            <span className="text-sm">Girar Esquerda</span>
            <span className="text-[11px] font-mono rounded bg-blue-950/80 px-2 py-0.5 text-cyan-200">
              K2 (Anti-horário)
            </span>
          </button>
        </div>

        {/* ALERTA DE SEGURANÇA E TEMPO MORTO */}
        <div className="min-h-6 text-center">
          {online && running && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/80 border border-blue-800/60 px-3 py-1 text-xs text-cyan-200">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              Para inverter, pressione PARAR primeiro (Intertravamento ativo).
            </p>
          )}
          {online && !running && lockRemaining > 0 && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/80 border border-amber-600/50 px-3 py-1 text-xs font-semibold text-amber-200">
              Tempo morto de inércia: {(lockRemaining / 1000).toFixed(1)} s
            </p>
          )}
        </div>

        {/* BOTÃO PARAR GIGANTE */}
        <button
          onClick={() => void send('OFF')}
          disabled={!online || sending}
          className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-red-600 to-red-800 py-7 text-2xl font-black tracking-wide shadow-xl shadow-red-950/60 transition active:scale-95 enabled:hover:from-red-500 enabled:hover:to-red-700 disabled:opacity-30 border border-red-400/40"
        >
          <Square className="h-7 w-7 fill-current" />
          PARAR MOTOR
        </button>

        {/* EMERGÊNCIA / REARMAR */}
        {emergency ? (
          <button
            onClick={() => void send('RESET')}
            disabled={!online || sending}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-sm font-bold border border-slate-600 transition active:scale-95 hover:bg-slate-700 disabled:opacity-30"
          >
            <RefreshCcw className="h-4 w-4 text-cyan-400" /> Rearmar Emergência
          </button>
        ) : (
          <button
            onClick={() => void send('EMERGENCY')}
            disabled={!online || sending}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-500/60 bg-red-950/40 py-3 text-xs font-bold text-red-300 transition active:scale-95 hover:bg-red-900/50 disabled:opacity-30"
          >
            <OctagonX className="h-4 w-4" /> EMERGÊNCIA GERAL
          </button>
        )}

        {toast && (
          <div
            role="alert"
            className="fixed inset-x-4 bottom-16 mx-auto max-w-sm rounded-xl border border-amber-500/80 bg-slate-900/95 p-3.5 text-xs text-amber-100 shadow-2xl backdrop-blur-md"
          >
            {toast}
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-cyan-300 transition-colors">
            ← Voltar ao Painel Geral
          </Link>
        </div>
      </main>

      {/* RODAPÉ DO ALUNO COM CRÉDITOS A GABRIEL PISKE */}
      <footer className="border-t border-blue-900/40 bg-slate-950/80 px-4 py-3 text-center text-[11px] text-slate-400">
        <p>
          SENAI • Laboratório Didático de Automação
        </p>
        <p className="mt-0.5 text-slate-400">
          Docente:{' '}
          <a
            href="https://piske.online"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-cyan-400 hover:underline inline-flex items-center gap-0.5"
          >
            Gabriel Piske
            <ExternalLink className="h-2.5 w-2.5" />
          </a>{' '}
          — Docente de Tecnologia e Eletrônica
        </p>
      </footer>
    </div>
  );
}
