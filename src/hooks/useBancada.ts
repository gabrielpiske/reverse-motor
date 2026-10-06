'use client';

import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import type { BancadaId } from '@/lib/bancadas';
import { getDb, isFirebaseConfigured, paths } from '@/lib/firebase';
import type { BancadaData } from '@/lib/types';

interface Subscription<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useRealtimeValue<T>(path: string): Subscription<T> {
  const [state, setState] = useState<Subscription<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setState({ data: null, loading: false, error: 'Firebase não configurado (.env.local).' });
      return;
    }
    return onValue(
      ref(getDb(), path),
      (snap) => setState({ data: (snap.val() as T | null) ?? null, loading: false, error: null }),
      (err) => setState({ data: null, loading: false, error: err.message }),
    );
  }, [path]);

  return state;
}

/** Dados em tempo real de uma bancada. */
export function useBancada(id: BancadaId): Subscription<BancadaData> {
  return useRealtimeValue<BancadaData>(paths.bancada(id));
}

/** Dados em tempo real de todas as bancadas (painel do instrutor). */
export function useAllBancadas(): Subscription<Partial<Record<BancadaId, BancadaData>>> {
  return useRealtimeValue<Partial<Record<BancadaId, BancadaData>>>(paths.root);
}
