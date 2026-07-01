export type VehicleType = 'vuc' | 'truck' | 'carro' | 'carreta' | 'outro';
export type DefectCategory = 'mechanical' | 'electrical' | 'bodywork' | 'safety' | 'other';
export type DefectStatus = 'pending' | 'in_progress' | 'resolved';
export type MovementStatus = 'out' | 'returned';

export interface Vehicle {
  id: string;
  estabelecimento_id: string | null;
  name: string;
  plate: string;
  vehicle_type: VehicleType;
  current_km: number;
  oil_change_interval: number;
  last_oil_change_km: number;
  next_oil_change_km: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  estabelecimento_id: string | null;
  name: string;
  license: string;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DefectType {
  id: string;
  estabelecimento_id: string | null;
  name: string;
  description: string | null;
  category: DefectCategory;
  created_at: string;
  updated_at: string;
}

export interface VehicleMovement {
  id: string;
  estabelecimento_id: string | null;
  vehicle_id: string;
  driver_id: string;
  security_guard_id: string | null;
  has_helper: boolean;
  helper_name: string | null;
  exit_time: string;
  exit_km: number;
  exit_notes: string | null;
  entry_time: string | null;
  entry_km: number | null;
  reported_defects: string | null;
  damage_notes: string | null;
  inspected_by: string | null;
  inspected_all_sides: boolean;
  resolved_at: string | null;
  status: MovementStatus;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  driver?: Driver;
}

export interface DamagePoint {
  x: number;
  y: number;
  side: 'front' | 'back' | 'left' | 'right' | 'top';
  description: string;
}

export interface DefectReport {
  id: string;
  estabelecimento_id: string | null;
  vehicle_id: string;
  driver_id: string | null;
  movement_id: string | null;
  defect_type_id: string | null;
  defect_description: string;
  reported_at: string;
  reported_by: string | null;
  status: DefectStatus;
  solution: string | null;
  cost: number | null;
  resolved_at: string | null;
  resolved_by: string | null;
  validated_by: string | null;
  is_damage_report: boolean;
  damage_points: DamagePoint[] | null;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  driver?: Driver;
  defect_type?: DefectType;
}
