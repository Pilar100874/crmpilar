import L from 'leaflet';

export interface EnquadrarOptions {
  /** Padding em px no canto superior esquerdo (áreas cobertas por painéis/headers) */
  paddingTopLeft?: [number, number];
  /** Padding em px no canto inferior direito */
  paddingBottomRight?: [number, number];
  /** Zoom máximo permitido (evita zoom absurdo com 1 ponto) */
  maxZoom?: number;
  /** Zoom usado quando todos os pontos são praticamente o mesmo lugar */
  zoomPontoUnico?: number;
  animate?: boolean;
}

/**
 * Enquadra o mapa no maior zoom possível para a área visível,
 * mantendo o conjunto de pontos centralizado nessa área.
 *
 * Diferente do fitBounds padrão do Leaflet, o centro é corrigido pelo
 * desbalanço de padding (painéis flutuantes) para que o grupo fique
 * visualmente centralizado na região realmente visível do mapa.
 */
export function enquadrarNoMapa(
  map: L.Map,
  bounds: L.LatLngBounds,
  options: EnquadrarOptions = {},
): void {
  if (!map || !bounds || !bounds.isValid()) return;

  const {
    paddingTopLeft = [16, 16],
    paddingBottomRight = [16, 16],
    maxZoom = 18,
    zoomPontoUnico = 17,
    animate = false,
  } = options;

  map.invalidateSize({ animate: false });

  const padTL = L.point(paddingTopLeft[0], paddingTopLeft[1]);
  const padBR = L.point(paddingBottomRight[0], paddingBottomRight[1]);

  const tamanhoTela = map.getSize();
  // Área realmente visível depois de descontar os painéis sobrepostos
  const areaUtil = tamanhoTela.subtract(padTL.add(padBR));
  if (areaUtil.x <= 20 || areaUtil.y <= 20) {
    map.setView(bounds.getCenter(), Math.min(map.getZoom(), maxZoom), { animate });
    return;
  }

  const pontoUnico =
    Math.abs(bounds.getNorth() - bounds.getSouth()) < 0.0005 &&
    Math.abs(bounds.getEast() - bounds.getWest()) < 0.0005;

  // Maior zoom em que o bounds ainda cabe na área útil (fracionário com zoomSnap: 0)
  const zoomMaximoPossivel = pontoUnico
    ? zoomPontoUnico
    : map.getBoundsZoom(bounds, false, padTL.add(padBR));

  const zoomFinal = Math.max(
    map.getMinZoom() ?? 0,
    Math.min(zoomMaximoPossivel, maxZoom),
  );

  // Corrige o centro: o centro da área útil não é o centro da tela
  // quando existe padding assimétrico (painéis à esquerda, header, etc.)
  const centroBoundsPx = map.project(bounds.getCenter(), zoomFinal);
  const deslocamento = padBR.subtract(padTL).divideBy(2);
  const centroFinal = map.unproject(centroBoundsPx.add(deslocamento), zoomFinal);

  map.setView(centroFinal, zoomFinal, { animate });
}

/** Cria um bounds a partir de uma lista de coordenadas válidas */
export function boundsDePontos(
  pontos: Array<[number, number] | { lat: number; lng: number }>,
): L.LatLngBounds | null {
  const latlngs = pontos
    .map((p) => (Array.isArray(p) ? { lat: p[0], lng: p[1] } : p))
    .filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        !(p.lat === 0 && p.lng === 0),
    )
    .map((p) => L.latLng(p.lat, p.lng));

  if (latlngs.length === 0) return null;
  return L.latLngBounds(latlngs);
}
