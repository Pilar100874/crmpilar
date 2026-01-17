import { Database } from '@/integrations/supabase/types';

// Use types from database schema
export type ProspectB2B = Database['public']['Tables']['prospects_b2b']['Row'];
export type ProspectB2BInsert = Database['public']['Tables']['prospects_b2b']['Insert'];
export type BuscaB2B = Database['public']['Tables']['prospects_b2b_buscas']['Row'];
export type BuscaB2BInsert = Database['public']['Tables']['prospects_b2b_buscas']['Insert'];
export type ConfigB2B = Database['public']['Tables']['prospects_b2b_config']['Row'];
export type ApiLogB2B = Database['public']['Tables']['prospects_b2b_api_log']['Row'];

export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface SearchFilters {
  keyword: string;
  polygon: PolygonPoint[];
  limit: number;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  types?: string[];
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  vicinity?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: any;
  url?: string;
  address_components?: any[];
}
