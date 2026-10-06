import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import BancadaHost from '@/components/BancadaHost';
import { BANCADAS, isBancadaId } from '@/lib/bancadas';

interface Props {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return BANCADAS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Estação Bancada ${id.toUpperCase()}` };
}

export default async function BancadaPage({ params }: Props) {
  const { id } = await params;
  const upper = id.toUpperCase();
  if (!isBancadaId(upper)) notFound();
  if (upper !== id) redirect(`/bancada/${upper}`);
  return <BancadaHost id={upper} />;
}
