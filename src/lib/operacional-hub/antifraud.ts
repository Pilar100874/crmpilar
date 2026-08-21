/**
 * PILAR 4 - SISTEMA ANTIFRAUDE
 * Validações de foto, localização e tempo de execução
 */

// Calcula hash simples de uma imagem para detectar duplicatas
export async function calculateImageHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// Verifica se a imagem é muito escura
export async function isImageTooDark(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      canvas.width = 50; // Reduced for performance
      canvas.height = 50;
      ctx?.drawImage(img, 0, 0, 50, 50);

      if (!ctx) {
        resolve(false);
        return;
      }

      const imageData = ctx.getImageData(0, 0, 50, 50);
      const data = imageData.data;
      let totalBrightness = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Calculate perceived brightness
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
        totalBrightness += brightness;
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      // Threshold: images with avg brightness < 30 are considered too dark
      resolve(avgBrightness < 30);
    };

    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
}

// Calcula distância entre duas coordenadas em metros
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Verifica se a localização está dentro do raio esperado
export function isLocationValid(
  currentLat: number,
  currentLon: number,
  expectedLat: number | null,
  expectedLon: number | null,
  radiusMeters: number = 500
): boolean {
  if (!expectedLat || !expectedLon) {
    return true; // Se não há localização esperada, considera válido
  }

  const distance = calculateDistance(currentLat, currentLon, expectedLat, expectedLon);
  return distance <= radiusMeters;
}

// Verifica se o tempo de execução é muito rápido (suspeito)
export function isExecutionTooFast(
  startedAt: Date,
  completedAt: Date,
  minMinutes: number
): boolean {
  const elapsedMinutes = (completedAt.getTime() - startedAt.getTime()) / (1000 * 60);
  return elapsedMinutes < minMinutes;
}

export interface AntifraudResult {
  isValid: boolean;
  isSuspicious: boolean;
  reasons: string[];
}

export async function validateTaskCompletion(params: {
  photoFile: File | null;
  existingPhotoHash: string | null;
  currentLocation: { lat: number; lng: number } | null;
  expectedLocation: { lat: number | null; lng: number | null; radius: number } | null;
  startedAt: Date | null;
  minExecutionMinutes: number;
  previousPhotoHashes?: string[];
}): Promise<AntifraudResult> {
  const reasons: string[] = [];
  let isSuspicious = false;

  // 1. Validar foto
  if (params.photoFile) {
    // Check if too dark
    const tooDark = await isImageTooDark(params.photoFile);
    if (tooDark) {
      reasons.push("Foto muito escura");
      isSuspicious = true;
    }

    // Check for duplicate
    const hash = await calculateImageHash(params.photoFile);
    if (params.previousPhotoHashes?.includes(hash)) {
      reasons.push("Foto duplicada detectada");
      isSuspicious = true;
    }
  }

  // 2. Validar localização
  if (
    params.currentLocation &&
    params.expectedLocation?.lat &&
    params.expectedLocation?.lng
  ) {
    const isValid = isLocationValid(
      params.currentLocation.lat,
      params.currentLocation.lng,
      params.expectedLocation.lat,
      params.expectedLocation.lng,
      params.expectedLocation.radius
    );
    if (!isValid) {
      reasons.push("Localização fora da área esperada");
      isSuspicious = true;
    }
  }

  // 3. Validar tempo de execução
  if (params.startedAt && params.minExecutionMinutes > 0) {
    const tooFast = isExecutionTooFast(
      params.startedAt,
      new Date(),
      params.minExecutionMinutes
    );
    if (tooFast) {
      reasons.push(`Tempo de execução muito rápido (mínimo: ${params.minExecutionMinutes} min)`);
      isSuspicious = true;
    }
  }

  return {
    isValid: reasons.length === 0,
    isSuspicious,
    reasons,
  };
}
