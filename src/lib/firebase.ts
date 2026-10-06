import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getDatabase, ref, serverTimestamp, set, type Database } from 'firebase/database';
import type { BancadaId } from './bancadas';
import type { MotorAction } from './types';

// As variáveis NEXT_PUBLIC_* precisam ser referenciadas literalmente para o Next.js embuti-las.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);

let db: Database | null = null;

export function getDb(): Database {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase não configurado. Preencha o arquivo .env.local (veja .env.example).');
  }
  if (!db) {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db;
}

export const paths = {
  root: 'bancadas',
  bancada: (id: BancadaId) => `bancadas/${id}`,
  device: (id: BancadaId) => `bancadas/${id}/device`,
  status: (id: BancadaId) => `bancadas/${id}/device/status`,
  command: (id: BancadaId) => `bancadas/${id}/commandQueue`,
};

function makeNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Publica um comando para a bancada (lido pela página /bancada/[id]). */
export async function sendCommand(id: BancadaId, action: MotorAction): Promise<void> {
  await set(ref(getDb(), paths.command(id)), {
    action,
    timestamp: serverTimestamp(),
    nonce: makeNonce(),
  });
}
