'use client';

import {
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  update,
  type DatabaseReference,
} from 'firebase/database';
import { Cable, Cloud, CloudOff, OctagonX, Power, RefreshCcw, Unplug, Usb, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import BancadaQRCode from '@/components/BancadaQRCode';
import FirebaseConfigWarning from '@/components/FirebaseConfigWarning';
import MotorStatusPanel from '@/components/MotorStatusPanel';
import StatusBadge from '@/components/StatusBadge';
import HeaderNav from '@/components/HeaderNav';
import EducationalFooter from '@/components/EducationalFooter';
import { isLocalhostUrl, useAppUrl } from '@/hooks/useAppUrl';
import type { BancadaId } from '@/lib/bancadas';
import { BAUD_RATE, COMMAND_MAX_AGE_MS, PING_INTERVAL_MS } from '@/lib/constants';
import { getDb, isFirebaseConfigured, paths } from '@/lib/firebase';
import { createTicker, SerialBridge } from '@/lib/serial';
import { isMotorAction, isMotorState, type CommandData, type MotorAction, type MotorState } from '@/lib/types';

type ConnState = 'disconnected' | 'connecting' | 'connected';
type LogKind = 'tx' | 'rx' | 'info' | 'error';

interface LogEntry {
  id: number;
  time: string;
  kind: LogKind;
  text: string;
}

const LOG_COLORS: Record<LogKind, string> = {
  tx: 'text-cyan-300',
  rx: 'text-emerald-300',
  info: 'text-slate-400',
  error: 'text-red-400',
};

/**
 * Página que fica aberta no computador da bancada, conectado via USB ao Arduino.
 * Faz a ponte Firebase (commandQueue) -> Serial (CMD:) e Serial (STATE:/ERR:) -> Firebase (device).
 */
export default function BancadaHost({ id }: { id: BancadaId }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [conn, setConn] = useState<ConnState>('disconnected');
  const [cloudOk, setCloudOk] = useState(false);
  const [motorState, setMotorState] = useState<MotorState>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const appUrl = useAppUrl();

  const bridgeRef = useRef<SerialBridge | null>(null);
  const motorStateRef = useRef<MotorState>('IDLE');
  const lastSyncedStateRef = useRef<MotorState | null>(null);
  const cleanupRef = useRef<Array<() => void>>([]);
  const logIdRef = useRef(0);

  useEffect(() => {
    setSupported(SerialBridge.isSupported() && window.isSecureContext);
  }, []);

  const deviceRef = useCallback((): DatabaseReference => ref(getDb(), paths.device(id)), [id]);

  const log = useCallback((kind: LogKind, text: string) => {
    const entry: LogEntry = {
      id: ++logIdRef.current,
      time: new Date().toLocaleTimeString('pt-BR'),
      kind,
      text,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const reportError = useCallback(
    (code: string) => {
      if (!isFirebaseConfigured) return;
      void update(deviceRef(), { 'telemetry/lastError': code, 'telemetry/errorAt': serverTimestamp() });
    },
    [deviceRef],
  );

  const sendSerial = useCallback(
    async (cmd: string) => {
      const bridge = bridgeRef.current;
      if (!bridge) return;
      try {
        await bridge.write(cmd);
        if (cmd !== 'CMD:PING') log('tx', cmd);
      } catch (err) {
        log('error', `Falha ao escrever na serial: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [log],
  );

  /** Executa um comando (vindo do Firebase ou dos botões locais) com intertravamento de software. */
  const executeCommand = useCallback(
    async (action: MotorAction, origem: 'IHM' | 'local') => {
      const current = motorStateRef.current;
      const cruzado =
        (action === 'K1_ON' && current === 'K2_RUNNING') || (action === 'K2_ON' && current === 'K1_RUNNING');
      if (cruzado) {
        log('error', `Intertravamento (${origem}): ${action} recusado com motor em ${current}.`);
        reportError('INTERLOCK');
        return;
      }
      await sendSerial(`CMD:${action}`);
      if (isFirebaseConfigured) {
        void update(deviceRef(), { 'telemetry/lastCommand': `CMD:${action}` });
      }
    },
    [deviceRef, log, reportError, sendSerial],
  );

  const handleLine = useCallback(
    (line: string) => {
      if (line.startsWith('STATE:')) {
        const s = line.slice(6);
        if (!isMotorState(s)) {
          log('rx', line);
          return;
        }
        motorStateRef.current = s;
        setMotorState(s);
        if (lastSyncedStateRef.current !== s) {
          lastSyncedStateRef.current = s;
          log('rx', line);
          if (isFirebaseConfigured) {
            void update(deviceRef(), {
              currentState: s,
              'telemetry/k1Active': s === 'K1_RUNNING',
              'telemetry/k2Active': s === 'K2_RUNNING',
              'telemetry/updatedAt': serverTimestamp(),
            });
          }
        }
      } else if (line.startsWith('ERR:')) {
        log('error', line);
        reportError(line.slice(4));
      } else {
        log('rx', line);
      }
    },
    [deviceRef, log, reportError],
  );

  /** Encerra tudo: timers, assinaturas, porta serial e marca a bancada como offline. */
  const teardown = useCallback(
    async (sendOff: boolean) => {
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];

      const bridge = bridgeRef.current;
      bridgeRef.current = null;
      if (!bridge) return;

      if (sendOff) {
        try {
          await bridge.write('CMD:OFF');
        } catch {
          /* watchdog do firmware desliga de qualquer forma */
        }
      }
      await bridge.disconnect();

      motorStateRef.current = 'IDLE';
      lastSyncedStateRef.current = null;
      setMotorState('IDLE');
      setConn('disconnected');

      if (isFirebaseConfigured) {
        try {
          await onDisconnect(ref(getDb(), paths.status(id))).cancel();
          await update(deviceRef(), {
            status: 'offline',
            currentState: 'IDLE',
            'telemetry/k1Active': false,
            'telemetry/k2Active': false,
            'telemetry/updatedAt': serverTimestamp(),
          });
        } catch {
          /* sem rede: o onDisconnect do servidor já marca offline */
        }
      }
    },
    [deviceRef, id],
  );

  // Handlers estáveis para callbacks de longa duração (serial / firebase).
  const handlersRef = useRef({ handleLine, executeCommand, teardown, log });
  handlersRef.current = { handleLine, executeCommand, teardown, log };

  const connect = useCallback(async () => {
    if (bridgeRef.current) return;
    const bridge = new SerialBridge({
      onLine: (line) => handlersRef.current.handleLine(line),
      onClose: (reason) => {
        handlersRef.current.log('error', `Arduino desconectado: ${reason}`);
        void handlersRef.current.teardown(false);
      },
    });

    setConn('connecting');
    try {
      await bridge.connect(BAUD_RATE);
    } catch (err) {
      setConn('disconnected');
      if (err instanceof DOMException && err.name === 'NotFoundError') return; // usuário cancelou
      log('error', `Não foi possível abrir a porta: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    bridgeRef.current = bridge;
    lastSyncedStateRef.current = null;
    setConn('connected');
    log('info', `Porta serial aberta (${BAUD_RATE} bps). Aguardando o Arduino reiniciar...`);

    // Watchdog: PING a cada 1 s (em Web Worker para não ser estrangulado em 2º plano).
    void sendSerial('CMD:PING');
    cleanupRef.current.push(createTicker(PING_INTERVAL_MS, () => void sendSerial('CMD:PING')));

    if (!isFirebaseConfigured) {
      log('error', 'Firebase não configurado: apenas controle local disponível.');
      return;
    }

    const db = getDb();
    const devRef = ref(db, paths.device(id));
    const statusRef = ref(db, paths.status(id));

    // Diferença entre o relógio local e o do servidor (para descartar comandos antigos).
    let serverOffset = 0;
    cleanupRef.current.push(
      onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
        serverOffset = Number(snap.val()) || 0;
      }),
    );

    // Presença: online enquanto houver conexão; o servidor marca offline se a aba cair.
    let hadCloud = false;
    cleanupRef.current.push(
      onValue(ref(db, '.info/connected'), (snap) => {
        const ok = snap.val() === true;
        setCloudOk(ok);
        if (ok) {
          hadCloud = true;
          void onDisconnect(statusRef)
            .set('offline')
            .then(() =>
              update(devRef, {
                status: 'online',
                currentState: motorStateRef.current,
                'telemetry/k1Active': motorStateRef.current === 'K1_RUNNING',
                'telemetry/k2Active': motorStateRef.current === 'K2_RUNNING',
                'telemetry/updatedAt': serverTimestamp(),
              }),
            );
        } else if (hadCloud) {
          // Alunos perderam o botão de parada remoto: desliga por segurança.
          handlersRef.current.log('error', 'Conexão com a nuvem perdida — motor desligado por segurança.');
          void sendSerial('CMD:OFF');
        }
      }),
    );

    // Fila de comandos vinda da IHM (/controle). O 1º snapshot é ignorado (comando antigo).
    let first = true;
    let lastNonce: string | null = null;
    cleanupRef.current.push(
      onValue(ref(db, paths.command(id)), (snap) => {
        const cmd = snap.val() as CommandData | null;
        if (first) {
          first = false;
          lastNonce = cmd?.nonce ?? null;
          return;
        }
        if (!cmd || !cmd.nonce || cmd.nonce === lastNonce) return;
        lastNonce = cmd.nonce;
        if (!isMotorAction(cmd.action)) {
          handlersRef.current.log('error', `Comando inválido ignorado: ${String(cmd.action)}`);
          return;
        }
        const age = Date.now() + serverOffset - Number(cmd.timestamp);
        if (age > COMMAND_MAX_AGE_MS && cmd.action !== 'OFF' && cmd.action !== 'EMERGENCY') {
          handlersRef.current.log('info', `Comando ${cmd.action} descartado (atrasado ${Math.round(age / 1000)} s).`);
          return;
        }
        void handlersRef.current.executeCommand(cmd.action, 'IHM');
      }),
    );
  }, [id, log, sendSerial]);

  // Ao sair da página / desmontar: desliga o motor e fecha a porta.
  useEffect(() => {
    const onUnload = () => {
      void bridgeRef.current?.write('CMD:OFF');
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      void handlersRef.current.teardown(true);
    };
  }, []);

  const connected = conn === 'connected';
  const qrWarning = appUrl && isLocalhostUrl(appUrl);

  return (
    <div className="flex min-h-dvh flex-col bg-grid-pattern">
      <HeaderNav />

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
        <FirebaseConfigWarning />

        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao Painel Geral
          </Link>
          <span className="text-xs text-slate-400">
            SENAI LAB • Bancada Didática {id}
          </span>
        </div>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-blue-900/50 bg-gradient-to-r from-[#0c2340]/90 to-[#061426]/90 p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#004587] to-[#005caa] text-4xl font-black text-white shadow-lg border border-blue-300/30">
              {id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#004587] px-2 py-0.5 text-xs font-bold text-white tracking-wider">
                  SENAI
                </span>
                <h1 className="text-2xl font-bold text-white">Estação da Bancada {id}</h1>
              </div>
              <p className="text-xs sm:text-sm text-cyan-300 mt-1">
                Comunicação Host USB (Web Serial 115200 bps) & Sincronização Firebase
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge ok={connected} okLabel="Arduino Conectado" failLabel="Arduino Desconectado" />
            <StatusBadge ok={connected && cloudOk} okLabel="Nuvem Online" failLabel="Nuvem Offline" />
          </div>
        </header>

        {supported === false && (
          <div className="mb-6 rounded-2xl border border-red-500/60 bg-red-950/50 p-4 text-sm text-red-200">
            Este navegador não suporta a Web Serial API ou a página não está em contexto seguro. Utilize{' '}
            <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> no computador da bancada.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-3">
              {!connected ? (
                <button
                  onClick={() => void connect()}
                  disabled={!supported || conn === 'connecting'}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#004587] to-[#005caa] px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-950/60 hover:from-[#005caa] hover:to-[#0072ce] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Usb className="h-5 w-5 text-cyan-300" />
                  {conn === 'connecting' ? 'Conectando...' : 'Conectar Arduino USB'}
                </button>
              ) : (
                <button
                  onClick={() => void teardown(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-900 bg-slate-800 px-5 py-3.5 font-bold text-slate-200 transition hover:bg-slate-700"
                >
                  <Unplug className="h-5 w-5 text-red-400" />
                  Desconectar Arduino
                </button>
              )}
            </div>

            <MotorStatusPanel state={motorState} online={connected} />

            <div className="rounded-2xl border border-blue-900/40 bg-slate-900/60 p-5 shadow-lg">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan-300">
                Comandos Locais do Instrutor
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void executeCommand('OFF', 'local')}
                  disabled={!connected}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white transition hover:bg-red-500 disabled:opacity-40 shadow-md shadow-red-950/40"
                >
                  <Power className="h-4 w-4" /> Parar Motor
                </button>
                <button
                  onClick={() => void executeCommand('EMERGENCY', 'local')}
                  disabled={!connected}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500 bg-red-950/40 px-5 py-2.5 font-bold text-red-300 transition hover:bg-red-900/60 disabled:opacity-40"
                >
                  <OctagonX className="h-4 w-4" /> Emergência
                </button>
                <button
                  onClick={() => void executeCommand('RESET', 'local')}
                  disabled={!connected || motorState !== 'EMERGENCY'}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                >
                  <RefreshCcw className="h-4 w-4 text-cyan-400" /> Rearmar
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-950 bg-black/70 p-5 shadow-inner">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Cable className="h-4 w-4 text-cyan-400" /> Monitor Serial da Bancada
              </h2>
              <div className="h-64 overflow-y-auto font-mono text-xs leading-relaxed border-t border-slate-900 pt-2">
                {logs.length === 0 && <p className="text-slate-600">Aguardando conexão com o Arduino...</p>}
                {logs.map((l) => (
                  <p key={l.id} className={LOG_COLORS[l.kind]}>
                    <span className="text-slate-600">{l.time}</span>{' '}
                    {l.kind === 'tx' ? '→ ' : l.kind === 'rx' ? '← ' : ''}
                    {l.text}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <aside className="flex flex-col items-center gap-4 rounded-3xl border border-blue-900/50 bg-gradient-to-b from-[#0c2340]/80 to-[#061426]/90 p-6 text-center shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#004587] px-2 py-0.5 text-[10px] font-bold text-white">SENAI</span>
              <h2 className="text-lg font-bold text-white">QR Code da Bancada</h2>
            </div>
            
            <p className="text-xs text-slate-300">
              Solicite aos alunos que escaneiem pelo smartphone para abrir a IHM de controle desta bancada.
            </p>

            <div className="rounded-2xl bg-white p-3 shadow-xl border-4 border-blue-800/40">
              <BancadaQRCode id={id} size={220} showUrl />
            </div>

            {qrWarning && (
              <p className="rounded-xl border border-amber-500/50 bg-amber-950/60 p-3 text-xs text-amber-200">
                Aviso: O QR Code aponta para <strong>localhost</strong>. Defina <code>NEXT_PUBLIC_APP_URL</code> no .env.local para que funcione pelo Wi-Fi no celular.
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-cyan-300">
              {cloudOk ? <Cloud className="h-4 w-4 text-cyan-400" /> : <CloudOff className="h-4 w-4 text-slate-500" />}
              Mantenha esta aba aberta durante a aula.
            </div>

            <div className="mt-auto pt-4 border-t border-blue-900/40 w-full text-center">
              <p className="text-[11px] text-slate-400">
                Docente: <a href="https://piske.online" target="_blank" rel="noopener noreferrer" className="text-cyan-300 font-semibold hover:underline">Gabriel Piske</a>
              </p>
            </div>
          </aside>
        </div>
      </main>

      <EducationalFooter compact />
    </div>
  );
}
