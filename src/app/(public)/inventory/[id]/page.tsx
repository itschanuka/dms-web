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
    const vehicle = await publicApi.getVehicle(id);
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
    const vehicle = await publicApi.getVehicle(id);
    return <VehicleDetailClient vehicle={vehicle} />;
  } catch {
    notFound();
  }
}
