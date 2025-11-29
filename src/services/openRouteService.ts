// OpenRouteService API integration
// Documentation: https://openrouteservice.org/dev/#/api-docs

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  geometry: Coordinate[];
  instructions?: RouteInstruction[];
}

export interface RouteInstruction {
  instruction: string;
  distance: number;
  duration: number;
  type: number;
  name: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  label: string;
  confidence: number;
}

export interface DistanceMatrixResult {
  durations: number[][];
  distances: number[][];
}

const ORS_BASE_URL = 'https://api.openrouteservice.org';

// Get API key from Supabase Edge Function (for security)
async function getApiKey(): Promise<string> {
  // In a real implementation, this would fetch from a secure source
  // For now, we'll use the key stored in Supabase secrets via edge function
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouteservice-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
    },
    body: JSON.stringify({ action: 'get-key' })
  });
  
  if (!response.ok) {
    throw new Error('Failed to get API key');
  }
  
  const data = await response.json();
  return data.apiKey;
}

// Decode polyline from ORS response
function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return coordinates;
}

// Calculate route between multiple points
export async function calculateRoute(
  coordinates: Coordinate[],
  profile: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking' = 'driving-car'
): Promise<RouteResult> {
  if (coordinates.length < 2) {
    throw new Error('At least 2 coordinates are required');
  }

  const apiKey = await getApiKey();
  
  const body = {
    coordinates: coordinates.map(c => [c.lng, c.lat]),
    instructions: true,
    geometry: true
  };

  const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to calculate route');
  }

  const data = await response.json();
  const route = data.routes[0];

  return {
    distance: route.summary.distance,
    duration: route.summary.duration,
    geometry: decodePolyline(route.geometry),
    instructions: route.segments[0]?.steps?.map((step: any) => ({
      instruction: step.instruction,
      distance: step.distance,
      duration: step.duration,
      type: step.type,
      name: step.name
    }))
  };
}

// Geocoding: Address to coordinates
export async function geocode(address: string): Promise<GeocodingResult[]> {
  const apiKey = await getApiKey();
  
  const params = new URLSearchParams({
    api_key: apiKey,
    text: address,
    'boundary.country': 'BRA',
    size: '5'
  });

  const response = await fetch(`${ORS_BASE_URL}/geocode/search?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Geocoding failed');
  }

  const data = await response.json();
  
  return data.features.map((feature: any) => ({
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    label: feature.properties.label,
    confidence: feature.properties.confidence
  }));
}

// Reverse geocoding: Coordinates to address
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const apiKey = await getApiKey();
  
  const params = new URLSearchParams({
    api_key: apiKey,
    'point.lat': lat.toString(),
    'point.lon': lng.toString(),
    size: '1'
  });

  const response = await fetch(`${ORS_BASE_URL}/geocode/reverse?${params}`);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  
  if (!data.features || data.features.length === 0) {
    return null;
  }

  const feature = data.features[0];
  return {
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    label: feature.properties.label,
    confidence: feature.properties.confidence
  };
}

// Distance matrix
export async function getDistanceMatrix(
  origins: Coordinate[],
  destinations: Coordinate[],
  profile: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking' = 'driving-car'
): Promise<DistanceMatrixResult> {
  const apiKey = await getApiKey();
  
  const allCoordinates = [...origins, ...destinations];
  const sources = origins.map((_, i) => i);
  const destinationsIdx = destinations.map((_, i) => origins.length + i);

  const body = {
    locations: allCoordinates.map(c => [c.lng, c.lat]),
    sources,
    destinations: destinationsIdx,
    metrics: ['distance', 'duration']
  };

  const response = await fetch(`${ORS_BASE_URL}/v2/matrix/${profile}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Distance matrix calculation failed');
  }

  const data = await response.json();
  
  return {
    durations: data.durations,
    distances: data.distances
  };
}

// Optimize route order (TSP - Traveling Salesman Problem)
export async function optimizeRoute(
  coordinates: Coordinate[],
  profile: 'driving-car' | 'driving-hgv' = 'driving-car'
): Promise<{ optimizedOrder: number[]; route: RouteResult }> {
  const apiKey = await getApiKey();
  
  // Create jobs for each waypoint
  const jobs = coordinates.slice(1, -1).map((coord, idx) => ({
    id: idx + 1,
    location: [coord.lng, coord.lat]
  }));

  // Start and end at the first coordinate
  const vehicles = [{
    id: 1,
    profile,
    start: [coordinates[0].lng, coordinates[0].lat],
    end: coordinates.length > 1 ? [coordinates[coordinates.length - 1].lng, coordinates[coordinates.length - 1].lat] : undefined
  }];

  const body = {
    jobs,
    vehicles
  };

  const response = await fetch(`${ORS_BASE_URL}/optimization`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Route optimization failed');
  }

  const data = await response.json();
  
  // Extract optimized order
  const optimizedOrder = [0]; // Start with first point
  data.routes[0].steps.forEach((step: any) => {
    if (step.type === 'job') {
      optimizedOrder.push(step.job);
    }
  });
  if (coordinates.length > 1) {
    optimizedOrder.push(coordinates.length - 1); // End point
  }

  // Get the full route with the optimized order
  const optimizedCoordinates = optimizedOrder.map(idx => coordinates[idx]);
  const route = await calculateRoute(optimizedCoordinates, profile);

  return {
    optimizedOrder,
    route
  };
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Format duration for display
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}