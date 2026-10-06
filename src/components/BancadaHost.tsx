'use client';

import {
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  update,
  type DatabaseReference,
} from 'firebase/database';
import { Cable, Cloud, CloudOff, OctagonX, Power, RefreshCcw, Unplug, Usb } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import BancadaQRCode from '@/components/BancadaQRCode';
import FirebaseConfigWarning from '@/components/FirebaseConfigWarning';
import MotorStatusPanel from '@/components/MotorStatusPanel';
import StatusBadge from '@/components/StatusBadge';
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
  tx: 'text-sky-300',
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
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <FirebaseConfigWarning />

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-4xl font-black text-slate-950">
            {id}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bancada {id}</h1>
            <p className="text-sm text-slate-400">Estação de comunicação — Arduino via USB</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge ok={connected} okLabel="Arduino conectado" failLabel="Arduino desconectado" />
          <StatusBadge ok={connected && cloudOk} okLabel="Nuvem online" failLabel="Nuvem offline" />
        </div>
      </header>

      {supported === false && (
        <div className="mb-6 rounded-xl border border-red-500/60 bg-red-950/40 p-4 text-sm text-red-200">
          Este navegador não suporta a Web Serial API ou a página não está em contexto seguro. Use{' '}
          <b>Google Chrome</b> ou <b>Microsoft Edge</b> no computador, acessando via <b>https://</b> ou{' '}
          <b>http://localhost</b>.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-3">
            {!connected ? (
              <button
                onClick={() => void connect()}
                disabled={!supported || conn === 'connecting'}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Usb className="h-5 w-5" />
                {conn === 'connecting' ? 'Conectando...' : 'Conectar Arduino'}
              </button>
            ) : (
              <button
                onClick={() => void teardown(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 font-bold transition hover:bg-slate-600"
              >
                <Unplug className="h-5 w-5" />
                Desconectar
              </button>
            )}
          </div>

          <MotorStatusPanel state={motorState} online={connected} />

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Comando local (instrutor)
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void executeCommand('OFF', 'local')}
                disabled={!connected}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-bold transition hover:bg-red-500 disabled:opacity-40"
              >
                <Power className="h-4 w-4" /> Parar
              </button>
              <button
                onClick={() => void executeCommand('EMERGENCY', 'local')}
                disabled={!connected}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-red-500 px-4 py-2 font-bold text-red-300 transition hover:bg-red-950 disabled:opacity-40"
              >
                <OctagonX className="h-4 w-4" /> Emergência
              </button>
              <button
                onClick={() => void executeCommand('RESET', 'local')}
                disabled={!connected || motorState !== 'EMERGENCY'}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 font-bold transition hover:bg-slate-600 disabled:opacity-40"
              >
                <RefreshCcw className="h-4 w-4" /> Rearmar
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-black/60 p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              <Cable className="h-4 w-4" /> Monitor serial
            </h2>
            <div className="h-64 overflow-y-auto font-mono text-xs leading-relaxed">
              {logs.length === 0 && <p className="text-slate-600">Nenhuma mensagem ainda.</p>}
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

        <aside className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-center">
          <h2 className="text-lg font-bold">Controle pelo celular</h2>
          <p className="text-sm text-slate-400">Aponte a câmera para o QR Code para abrir a IHM da Bancada {id}.</p>
          <BancadaQRCode id={id} size={260} showUrl />
          {qrWarning && (
            <p className="rounded-lg bg-amber-950/50 p-3 text-xs text-amber-200">
              O QR Code aponta para <b>localhost</b> e não abrirá no celular. Defina{' '}
              <code className="font-mono">NEXT_PUBLIC_APP_URL</code> no .env.local.
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {cloudOk ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
            Mantenha esta aba aberta durante a aula.
          </div>
          <Link href="/" className="text-sm text-amber-300 underline-offset-4 hover:underline">
            ← Voltar ao painel
          </Link>
        </aside>
      </div>
    </main>
  );
}
