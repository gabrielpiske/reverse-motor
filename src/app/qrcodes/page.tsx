'use client';

import { Printer } from 'lucide-react';
import Link from 'next/link';
import BancadaQRCode from '@/components/BancadaQRCode';
import { isLocalhostUrl, useAppUrl } from '@/hooks/useAppUrl';
import { BANCADAS } from '@/lib/bancadas';

/** Folha A4 para impressão: um cartão com QR Code por bancada (A–L). */
export default function QRCodesPage() {
  const appUrl = useAppUrl();

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">QR Codes das bancadas</h1>
          <p className="text-sm text-slate-400">Imprima e fixe cada cartão na bancada correspondente.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="rounded-xl bg-slate-800 px-4 py-2 hover:bg-slate-700">
            ← Painel
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 font-bold text-slate-950 hover:bg-amber-300"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {appUrl && isLocalhostUrl(appUrl) && (
        <p className="no-print mb-6 rounded-xl border border-amber-500/50 bg-amber-950/40 p-4 text-sm text-amber-200">
          Atenção: os QR Codes apontam para <b>{appUrl}</b>, que não abre no celular. Defina{' '}
          <code className="font-mono">NEXT_PUBLIC_APP_URL</code> com o endereço público ou o IP do servidor.
        </p>
      )}

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 print:grid-cols-3 print:gap-4">
        {BANCADAS.map((id) => (
          <div
            key={id}
            className="print-page flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-600 bg-white p-5 text-slate-900 print:border-slate-400"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Bancada</p>
            <p className="-mt-2 text-6xl font-black leading-none">{id}</p>
            <BancadaQRCode id={id} size={170} />
            <p className="text-center text-xs leading-snug text-slate-600">
              Escaneie para controlar a partida
              <br />e a reversão do motor trifásico
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
