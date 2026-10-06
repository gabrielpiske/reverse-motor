'use client';

import { useEffect, useState } from 'react';
import type { BancadaId } from '@/lib/bancadas';

/**
 * URL base usada nos QR Codes. Prioriza NEXT_PUBLIC_APP_URL porque, na bancada,
 * a página costuma estar em "localhost" (exigência da Web Serial), endereço que
 * não funciona no celular do aluno.
 */
export function useAppUrl(): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setUrl(base.replace(/\/+$/, ''));
  }, []);
  return url;
}

export function controleUrl(base: string, id: BancadaId): string {
  return `${base}/controle/${id}`;
}

export function isLocalhostUrl(url: string): boolean {
  return /\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
}
