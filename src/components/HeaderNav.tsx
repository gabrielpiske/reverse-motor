import Link from 'next/link';
import { Layers, QrCode, ExternalLink } from 'lucide-react';

export default function HeaderNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-blue-900/40 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 items-center justify-center rounded-lg bg-[#004587] px-2.5 font-black text-white text-base tracking-wider shadow-md shadow-blue-950/50 group-hover:bg-[#005caa] transition-colors">
            SENAI
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
              Acionamento Trifásico
            </span>
            <span className="text-[10px] text-blue-300 font-mono">
              Reversão K1 / K2 • 12 Bancadas
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <Link
            href="/qrcodes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-700/50 bg-blue-950/40 px-3 py-1.5 font-medium text-blue-200 hover:bg-blue-900/50 hover:text-white transition-all shadow-sm"
          >
            <QrCode className="h-4 w-4 text-blue-400" />
            <span className="hidden sm:inline">Folha de</span> QR Codes
          </Link>

          <a
            href="https://piske.online"
            target="_blank"
            rel="noopener noreferrer"
            title="Gabriel Piske - Docente e Desenvolvedor Educacional"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#004587]/40 border border-[#005caa]/50 px-3 py-1.5 font-medium text-slate-200 hover:bg-[#005caa] hover:text-white transition-all"
          >
            <span className="hidden md:inline text-xs text-blue-300">Docente:</span>
            <span className="font-semibold text-xs sm:text-sm">Gabriel Piske</span>
            <ExternalLink className="h-3.5 w-3.5 text-blue-300" />
          </a>
        </div>
      </div>
    </header>
  );
}
