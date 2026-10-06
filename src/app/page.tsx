'use client';

import { Monitor, Printer, Smartphone } from 'lucide-react';
import Link from 'next/link';
import BancadaQRCode from '@/components/BancadaQRCode';
import FirebaseConfigWarning from '@/components/FirebaseConfigWarning';
import StatusBadge from '@/components/StatusBadge';
import { useAllBancadas } from '@/hooks/useBancada';
import { BANCADAS } from '@/lib/bancadas';
import { STATE_LABEL } from '@/lib/constants';

const STATE_COLOR = {
  IDLE: 'text-slate-300',
  K1_RUNNING: 'text-emerald-300',
  K2_RUNNING: 'text-sky-300',
  EMERGENCY: 'text-red-400',
} as const;

/** Painel do instrutor: visão geral das 12 bancadas (A–L). */
export default function PainelPage() {
  const { data } = useAllBancadas();
  const onlineCount = BANCADAS.filter((id) => data?.[id]?.device?.status === 'online').length;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <FirebaseConfigWarning />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Laboratório — Partida e Reversão de Motor Trifásico</h1>
          <p className="mt-1 text-slate-400">
            {onlineCount} de {BANCADAS.length} bancadas online
          </p>
        </div>
        <Link
          href="/qrcodes"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 font-bold text-slate-950 hover:bg-amber-300"
        >
          <Printer className="h-4 w-4" /> Imprimir QR Codes
        </Link>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {BANCADAS.map((id) => {
          const device = data?.[id]?.device;
          const online = device?.status === 'online';
          const state = device?.currentState ?? 'IDLE';
          return (
            <article
              key={id}
              className={`flex flex-col items-center gap-3 rounded-2xl border p-5 ${
                online && state === 'EMERGENCY'
                  ? 'border-red-500 bg-red-950/40'
                  : online
                    ? 'border-emerald-700/60 bg-slate-900/70'
                    : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-3xl font-black text-slate-950">
                  {id}
                </span>
                <StatusBadge ok={online} okLabel="Online" failLabel="Offline" />
              </div>
              <BancadaQRCode id={id} size={150} />
              <p className={`text-center text-sm font-semibold ${online ? STATE_COLOR[state] : 'text-slate-500'}`}>
                {online ? STATE_LABEL[state] : 'Estação desconectada'}
              </p>
              <div className="grid w-full grid-cols-2 gap-2 text-sm">
                <Link
                  href={`/bancada/${id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2 py-2 hover:bg-slate-700"
                >
                  <Monitor className="h-4 w-4" /> Estação
                </Link>
                <Link
                  href={`/controle/${id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2 py-2 hover:bg-slate-700"
                >
                  <Smartphone className="h-4 w-4" /> IHM
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
