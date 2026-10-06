'use client';

import { Printer, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import BancadaQRCode from '@/components/BancadaQRCode';
import HeaderNav from '@/components/HeaderNav';
import EducationalFooter from '@/components/EducationalFooter';
import { isLocalhostUrl, useAppUrl } from '@/hooks/useAppUrl';
import { BANCADAS } from '@/lib/bancadas';

/** Folha A4 para impressão com cartões didáticos SENAI para cada uma das 12 bancadas (A–L). */
export default function QRCodesPage() {
  const appUrl = useAppUrl();

  return (
    <div className="flex min-h-dvh flex-col bg-grid-pattern print:bg-white">
      <div className="no-print">
        <HeaderNav />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8 print:max-w-none print:p-0">
        <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-blue-900/50 bg-[#0c2340]/90 p-6 backdrop-blur-md shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#004587] px-2 py-0.5 text-xs font-bold text-white tracking-wider">
                SENAI
              </span>
              <h1 className="text-2xl font-black text-white">Cartões com QR Code para as 12 Bancadas</h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-cyan-300">
              Imprima esta folha em papel A4 e fixe o cartão na estrutura física de cada bancada correspondente (A até L).
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Painel Geral
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#004587] to-[#005caa] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/60 hover:from-[#005caa] hover:to-[#0072ce] transition-all"
            >
              <Printer className="h-4 w-4 text-cyan-300" /> Imprimir Folha A4
            </button>
          </div>
        </div>

        {appUrl && isLocalhostUrl(appUrl) && (
          <div className="no-print mb-6 rounded-2xl border border-amber-500/50 bg-amber-950/50 p-4 text-xs sm:text-sm text-amber-200">
            Atenção: Os QR Codes estão apontando para <strong>{appUrl}</strong>. Em rede local com celulares de alunos, configure <code>NEXT_PUBLIC_APP_URL</code> com o IP da máquina ou o domínio público antes de imprimir os cartões definitivos.
          </div>
        )}

        {/* GRADE DE CARTÕES PARA IMPRESSÃO */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 print:grid-cols-3 print:gap-3">
          {BANCADAS.map((id) => (
            <div
              key={id}
              className="print-page flex flex-col items-center justify-between gap-2.5 rounded-2xl border-2 border-dashed border-blue-900/60 bg-white p-4 text-slate-900 shadow-md print:border-slate-800 print:shadow-none"
            >
              <div className="flex w-full items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="rounded bg-[#004587] px-2 py-0.5 text-[10px] font-black tracking-wider text-white">
                  SENAI
                </span>
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                  Acionamentos Elétricos
                </span>
              </div>

              <div className="flex items-center gap-2 text-center">
                <span className="text-xs font-bold text-slate-600 uppercase">Bancada</span>
                <span className="text-5xl font-black text-[#004587] leading-none">{id}</span>
              </div>

              <div className="p-1">
                <BancadaQRCode id={id} size={150} />
              </div>

              <div className="text-center">
                <p className="text-[11px] font-bold text-slate-800">
                  Partida & Reversão de Motor Trifásico
                </p>
                <p className="text-[9px] text-slate-700">
                  Aponte a câmera do celular para acionar K1 e K2
                </p>
              </div>

              <div className="w-full border-t border-slate-200 pt-1 text-center text-[8px] text-slate-700">
                Prof. Gabriel Piske (piske.online) • SENAI Automação
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className="no-print">
        <EducationalFooter />
      </div>
    </div>
  );
}
