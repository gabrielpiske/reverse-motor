'use client';

import {
  Monitor,
  Printer,
  Smartphone,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Cpu,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import BancadaQRCode from '@/components/BancadaQRCode';
import FirebaseConfigWarning from '@/components/FirebaseConfigWarning';
import StatusBadge from '@/components/StatusBadge';
import HeaderNav from '@/components/HeaderNav';
import EducationalFooter from '@/components/EducationalFooter';
import { useAllBancadas } from '@/hooks/useBancada';
import { BANCADAS } from '@/lib/bancadas';
import { STATE_LABEL } from '@/lib/constants';

const STATE_COLOR = {
  IDLE: 'text-slate-300',
  K1_RUNNING: 'text-emerald-300',
  K2_RUNNING: 'text-cyan-300',
  EMERGENCY: 'text-red-400',
} as const;

export default function PainelPage() {
  const { data } = useAllBancadas();
  const onlineCount = BANCADAS.filter((id) => data?.[id]?.device?.status === 'online').length;

  return (
    <div className="flex min-h-dvh flex-col bg-grid-pattern">
      <HeaderNav />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <FirebaseConfigWarning />

        {/* HERO SECTION DIDÁTICO */}
        <section className="relative overflow-hidden rounded-3xl border border-blue-800/40 bg-gradient-to-br from-[#0c2340]/90 via-[#0a192f]/95 to-[#020b18] p-6 shadow-2xl backdrop-blur-xl sm:p-10 mb-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#004587]/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-900/40 px-3.5 py-1 text-xs font-semibold text-blue-200 mb-4 shadow-inner">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              SENAI • Automação & Comandos Elétricos Industriais
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
              Plataforma de Partida e Reversão de <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-white bg-clip-text text-transparent">Motor Trifásico</span>
            </h1>

            <p className="mt-4 text-base text-slate-300 sm:text-lg leading-relaxed">
              Ambiente didático integrado para 12 bancadas eletroeletrônicas numeradas de <strong>A até L</strong>. 
              Controle remoto seguro dos contatores <strong>K1 (Horário)</strong> e <strong>K2 (Anti-horário)</strong> via 
              microcontrolador Arduino com intertravamento por hardware, software e telemetria em tempo real via nuvem.
            </p>

            {/* Destaque ao Docente Gabriel Piske */}
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-950/40 p-4 text-sm text-slate-300">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#004587] text-white font-bold shadow-md">
                GP
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Prof. Gabriel Piske</span>
                  <a
                    href="https://piske.online"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded bg-blue-600/20 px-2 py-0.5 text-xs font-bold text-cyan-300 hover:bg-blue-600/30 hover:underline transition-all"
                  >
                    piske.online
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Docente de Tecnologia e Eletrônica e Desenvolvedor de Ferramentas e Softwares Educacionais
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#bancadas"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#004587] to-[#005caa] px-6 py-3 font-bold text-white shadow-lg shadow-blue-900/50 hover:from-[#005caa] hover:to-[#0072ce] transition-all transform active:scale-95"
              >
                Acessar as 12 Bancadas
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/qrcodes"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-950/50 px-6 py-3 font-bold text-blue-200 hover:bg-blue-900/50 hover:text-white transition-all shadow-sm"
              >
                <Printer className="h-4 w-4 text-cyan-400" />
                Imprimir QR Codes de A–L
              </Link>
            </div>
          </div>
        </section>

        {/* SEÇÃO DIDÁTICA EXPLICATIVA (COMO FUNCIONA O SISTEMA) */}
        <section className="mb-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2 border-b border-blue-900/40 pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <BookOpen className="h-5 w-5 text-cyan-400" />
                Como Funciona a Aplicação Didática
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Princípios de comandos elétricos, segurança de intertravamento e fluxo de operação no laboratório
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* CARD 1 */}
            <div className="group rounded-2xl border border-blue-900/50 bg-slate-900/60 p-5 shadow-lg hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 text-cyan-400 border border-blue-800/60 group-hover:scale-110 transition-transform">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Reversão de Fases Trifásica</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Ao comutar entre <strong>K1</strong> (Horário) e <strong>K2</strong> (Anti-horário), ocorre a inversão de 
                duas fases alimentadoras do motor, mudando o sentido do campo magnético girante no estator.
              </p>
            </div>

            {/* CARD 2 */}
            <div className="group rounded-2xl border border-blue-900/50 bg-slate-900/60 p-5 shadow-lg hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 text-emerald-400 border border-blue-800/60 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Intertravamento Triplo</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                K1 e K2 <strong>jamais ligam juntos</strong> para prevenir curto fase-fase. A proteção atua na IHM web (bloqueio 
                visual), na Estação Serial e no firmware C++ do Arduino conferindo pinos e estados.
              </p>
            </div>

            {/* CARD 3 */}
            <div className="group rounded-2xl border border-blue-900/50 bg-slate-900/60 p-5 shadow-lg hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60 group-hover:scale-110 transition-transform">
                <Radio className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">QR Code & Conectividade</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Cada bancada possui seu próprio <strong>QR Code</strong> exclusivo. O aluno escaneia pelo smartphone e opera a 
                IHM móvel em tempo real sincronizada via Firebase Realtime Database.
              </p>
            </div>

            {/* CARD 4 */}
            <div className="group rounded-2xl border border-blue-900/50 bg-slate-900/60 p-5 shadow-lg hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 text-amber-400 border border-blue-800/60 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Tempo Morto & Watchdog</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Inércia mecânica protegida por retardo de 2 segundos após desligamento antes da reversão, além de 
                <strong> Watchdog de 3000ms</strong> que desliga os relés em caso de falha de conexão.
              </p>
            </div>
          </div>
        </section>

        {/* GRADE DAS 12 BANCADAS */}
        <section id="bancadas" className="scroll-mt-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-blue-900/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">Supervisão das 12 Bancadas</h2>
                <span className="rounded-full bg-blue-950 border border-blue-700/50 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
                  A até L
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Selecione uma bancada para abrir a <strong>Estação Host (Serial)</strong> ou a <strong>IHM Móvel do Aluno</strong>.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Status geral: <strong className="text-white">{onlineCount}</strong> de {BANCADAS.length} online
              </span>
              <Link
                href="/qrcodes"
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-blue-900 hover:text-white transition-all shadow-sm"
              >
                <Printer className="h-3.5 w-3.5 text-cyan-400" />
                Imprimir QR Codes
              </Link>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {BANCADAS.map((id) => {
              const device = data?.[id]?.device;
              const online = device?.status === 'online';
              const state = device?.currentState ?? 'IDLE';

              return (
                <article
                  key={id}
                  className={`flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all shadow-lg hover:shadow-blue-950/40 ${
                    online && state === 'EMERGENCY'
                      ? 'border-red-500/80 bg-red-950/50 shadow-red-950/30'
                      : online
                        ? 'border-cyan-500/50 bg-gradient-to-b from-[#0e2747]/80 to-[#09182d]/90 shadow-cyan-950/20'
                        : 'border-blue-950/80 bg-slate-950/60 opacity-90 hover:opacity-100 hover:border-blue-800'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#004587] to-[#005caa] text-2xl font-black text-white shadow-md border border-blue-400/30">
                        {id}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">Bancada {id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">SENAI LAB</span>
                      </div>
                    </div>
                    <StatusBadge ok={online} okLabel="Online" failLabel="Offline" />
                  </div>

                  <div className="my-1 rounded-xl bg-white/95 p-2 shadow-inner border border-blue-200">
                    <BancadaQRCode id={id} size={140} />
                  </div>

                  <div className="w-full rounded-lg bg-black/40 px-2 py-1.5 text-center border border-blue-950">
                    <p className={`text-xs font-semibold ${online ? STATE_COLOR[state] : 'text-slate-500'}`}>
                      {online ? STATE_LABEL[state] : 'Estação USB Desconectada'}
                    </p>
                  </div>

                  <div className="grid w-full grid-cols-2 gap-2 text-xs pt-1">
                    <Link
                      href={`/bancada/${id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-800/60 bg-blue-950/60 px-2.5 py-2 font-semibold text-slate-200 hover:bg-blue-800 hover:text-white transition-all shadow-sm"
                    >
                      <Monitor className="h-3.5 w-3.5 text-cyan-400" />
                      Estação USB
                    </Link>
                    <Link
                      href={`/controle/${id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#004587] px-2.5 py-2 font-semibold text-white hover:bg-[#005caa] transition-all shadow-sm"
                    >
                      <Smartphone className="h-3.5 w-3.5 text-cyan-200" />
                      IHM Aluno
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <EducationalFooter />
    </div>
  );
}
