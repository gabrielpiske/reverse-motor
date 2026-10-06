import { ExternalLink, ShieldCheck, Cpu } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export default function EducationalFooter({ compact = false }: Props) {
  return (
    <footer className={`mt-auto border-t border-blue-900/40 bg-slate-950/70 text-slate-400 no-print ${compact ? 'py-4 text-xs' : 'py-8 text-sm'}`}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:text-left">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#004587] px-2.5 py-0.5 text-xs font-bold text-white tracking-wide shadow-sm">
              SENAI
            </span>
            <span className="font-semibold text-slate-200">
              Plataforma Didática de Acionamentos Elétricos
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Controle de Partida e Reversão de Motor Trifásico com Intertravamento de Segurança (K1/K2)
          </p>
        </div>

        <div className="flex flex-col items-center gap-1 sm:items-end">
          <div className="flex items-center gap-1.5 text-xs">
            <span>Docente & Coordenação:</span>
            <a
              href="https://piske.online"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              Gabriel Piske
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[11px] text-slate-400 text-center sm:text-right max-w-md">
            Docente de Tecnologia e Eletrônica e Desenvolvedor de Ferramentas e Softwares Educacionais
          </p>
        </div>
      </div>
      
      {!compact && (
        <div className="mx-auto mt-4 max-w-7xl border-t border-slate-900 px-4 pt-3 text-center text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-4">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Intertravamento por Software & Hardware
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5 text-blue-400" />
            Ponte Web Serial & Firebase Realtime
          </span>
          <span>•</span>
          <span>12 Bancadas Didáticas (A até L)</span>
        </div>
      )}
    </footer>
  );
}
