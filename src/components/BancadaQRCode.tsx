'use client';

import { QRCodeSVG } from 'qrcode.react';
import { controleUrl, useAppUrl } from '@/hooks/useAppUrl';
import type { BancadaId } from '@/lib/bancadas';

interface Props {
  id: BancadaId;
  size?: number;
  showUrl?: boolean;
}

/** QR Code que leva o celular do aluno até a IHM /controle/[id]. */
export default function BancadaQRCode({ id, size = 220, showUrl = false }: Props) {
  const base = useAppUrl();
  const url = base ? controleUrl(base, id) : '';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl bg-white p-3 shadow-lg" style={{ width: size + 24, height: size + 24 }}>
        {url ? (
          <QRCodeSVG value={url} size={size} level="M" marginSize={0} title={`IHM da Bancada ${id}`} />
        ) : (
          <div className="h-full w-full animate-pulse rounded bg-slate-200" />
        )}
      </div>
      {showUrl && url && <p className="break-all text-center font-mono text-xs opacity-70">{url}</p>}
    </div>
  );
}
