import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import ControlePanel from '@/components/ControlePanel';
import { BANCADAS, isBancadaId } from '@/lib/bancadas';

interface Props {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return BANCADAS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `IHM Bancada ${id.toUpperCase()}` };
}

export default async function ControlePage({ params }: Props) {
  const { id } = await params;
  const upper = id.toUpperCase();
  if (!isBancadaId(upper)) notFound();
  if (upper !== id) redirect(`/controle/${upper}`);
  return <ControlePanel id={upper} />;
}
