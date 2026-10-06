interface Props {
  ok: boolean;
  okLabel: string;
  failLabel: string;
}

export default function StatusBadge({ ok, okLabel, failLabel }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/60 text-slate-400'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-slate-500'}`} />
      {ok ? okLabel : failLabel}
    </span>
  );
}
