import { AlertTriangle } from 'lucide-react';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function FirebaseConfigWarning() {
  if (isFirebaseConfigured) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-950/40 p-4 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        Firebase não configurado. Copie <code className="font-mono">.env.example</code> para{' '}
        <code className="font-mono">.env.local</code>, preencha as chaves do seu projeto e reinicie o servidor.
      </p>
    </div>
  );
}
