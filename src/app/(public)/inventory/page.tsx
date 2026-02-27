import type { Metadata } from 'next';
import { publicApi, type VehicleFilters } from '@/lib/api';
import InventoryClient from './InventoryClient';

export const metadata: Metadata = {
  title: 'Inventory',
  description:
    'Browse our full selection of used, reconditioned, and brand new vehicles. Filter by make, year, fuel type, and more.',
};

export default async function InventoryPage() {
  let filters: VehicleFilters = {
    makes: [],
    years: [],
    bodyTypes: [],
    fuelTypes: [],
    transmissions: [],
  };

  try {
    const result = await publicApi.getVehicleFilters();
    if (result.success) filters = result.data;
  } catch {
    // Filters stay empty — client can still search
  }

  return <InventoryClient initialFilters={filters} />;
}