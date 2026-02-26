import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import VehicleDetailClient from './VehicleDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const result = await publicApi.getVehicle(id);
    if (!result.success) return { title: 'Vehicle Detail' };
    const vehicle = result.data;
    return {
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant ? ' ' + vehicle.variant : ''}`,
      description: `${vehicle.condition} ${vehicle.year} ${vehicle.make} ${vehicle.model} — ${vehicle.fuel_type}, ${vehicle.transmission}. Asking price: LKR ${vehicle.asking_price.toLocaleString()}.`,
    };
  } catch {
    return { title: 'Vehicle Detail' };
  }
}

export default async function VehicleDetailPage({ params }: Props) {
  try {
    const { id } = await params;
    const result = await publicApi.getVehicle(id);
    if (!result.success) notFound();
    return <VehicleDetailClient vehicle={result.data} />;
  } catch {
    notFound();
  }
}