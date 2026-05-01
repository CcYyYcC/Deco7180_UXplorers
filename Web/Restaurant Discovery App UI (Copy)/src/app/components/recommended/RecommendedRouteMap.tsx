import { useEffect, useRef } from 'react';
import { RouteInfo } from './RouteCard';

interface RecommendedRouteMapProps {
  selectedRoute: RouteInfo | null;
  walkingTimes?: string[];
}

export default function RecommendedRouteMap({ selectedRoute, walkingTimes = ['8 mins walk', '6 mins walk'] }: RecommendedRouteMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const latToY = (lat: number, minLat: number, maxLat: number, height: number) => {
    return ((maxLat - lat) / (maxLat - minLat)) * height;
  };

  const lngToX = (lng: number, minLng: number, maxLng: number, width: number) => {
    return ((lng - minLng) / (maxLng - minLng)) * width;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    if (!selectedRoute || selectedRoute.spots.length === 0) {
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select a route to view on map', width / 2, height / 2);
      return;
    }

    const padding = 80;
    const lats = selectedRoute.spots.map(s => s.lat);
    const lngs = selectedRoute.spots.map(s => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;
    const paddedMinLat = minLat - latRange * 0.15;
    const paddedMaxLat = maxLat + latRange * 0.15;
    const paddedMinLng = minLng - lngRange * 0.15;
    const paddedMaxLng = maxLng + lngRange * 0.15;

    const centerLat = (paddedMinLat + paddedMaxLat) / 2;
    const centerLng = (paddedMinLng + paddedMaxLng) / 2;

    const zoom = 13;
    const tileSize = 256;

    const lon2tile = (lon: number, zoom: number) => {
      return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
    };

    const lat2tile = (lat: number, zoom: number) => {
      return Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
          Math.pow(2, zoom)
      );
    };

    const centerTileX = lon2tile(centerLng, zoom);
    const centerTileY = lat2tile(centerLat, zoom);

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    const tilesX = Math.ceil(width / tileSize) + 2;
    const tilesY = Math.ceil(height / tileSize) + 2;

    const loadedTiles: { [key: string]: boolean } = {};
    let tilesToLoad = 0;

    for (let dx = -Math.floor(tilesX / 2); dx <= Math.floor(tilesX / 2); dx++) {
      for (let dy = -Math.floor(tilesY / 2); dy <= Math.floor(tilesY / 2); dy++) {
        const tileX = centerTileX + dx;
        const tileY = centerTileY + dy;

        if (tileX < 0 || tileY < 0 || tileX >= Math.pow(2, zoom) || tileY >= Math.pow(2, zoom)) {
          continue;
        }

        const x = width / 2 + dx * tileSize;
        const y = height / 2 + dy * tileSize;

        const tileUrl = `https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/${zoom}/${tileX}/${tileY}.png`;
        const tileKey = `${tileX}-${tileY}`;

        tilesToLoad++;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.globalAlpha = 0.7;
          ctx.drawImage(img, x, y, tileSize, tileSize);
          ctx.globalAlpha = 1.0;
          loadedTiles[tileKey] = true;

          if (Object.keys(loadedTiles).length === tilesToLoad) {
            drawRoute();
          }
        };
        img.onerror = () => {
          ctx.fillStyle = '#e5e5e5';
          ctx.fillRect(x, y, tileSize, tileSize);
          loadedTiles[tileKey] = true;

          if (Object.keys(loadedTiles).length === tilesToLoad) {
            drawRoute();
          }
        };
        img.src = tileUrl;
      }
    }

    const drawRoute = () => {
      const points = selectedRoute.spots.map(spot => ({
        x: lngToX(spot.lng, paddedMinLng, paddedMaxLng, width - padding * 2) + padding,
        y: latToY(spot.lat, paddedMinLat, paddedMaxLat, height - padding * 2) + padding,
      }));

      if (points.length > 1) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.shadowColor = 'rgba(239, 68, 68, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        for (let i = 0; i < points.length - 1; i++) {
          const midX = (points[i].x + points[i + 1].x) / 2;
          const midY = (points[i].y + points[i + 1].y) / 2;

          const text = walkingTimes[i] || '5 mins walk';
          ctx.font = 'bold 12px sans-serif';
          const textWidth = ctx.measureText(text).width;

          ctx.shadowColor = 'rgba(59, 130, 246, 0.2)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = '#eff6ff';
          ctx.fillRect(midX - textWidth / 2 - 8, midY - 12, textWidth + 16, 24);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(midX - textWidth / 2 - 8, midY - 12, textWidth + 16, 24);

          ctx.fillStyle = '#2563eb';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, midX, midY);
        }
      }

      const labels = ['A', 'B', 'C'];
      selectedRoute.spots.forEach((spot, index) => {
        const x = lngToX(spot.lng, paddedMinLng, paddedMaxLng, width - padding * 2) + padding;
        const y = latToY(spot.lat, paddedMinLat, paddedMaxLat, height - padding * 2) + padding;

        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labels[index] || (index + 1).toString(), x, y);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        const nameWidth = ctx.measureText(spot.name).width;
        ctx.fillRect(x - nameWidth / 2 - 8, y + 30, nameWidth + 16, 22);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1f2937';
        ctx.fillText(spot.name, x, y + 41);
      });
    };

    if (tilesToLoad === 0) {
      drawRoute();
    }

  }, [selectedRoute, walkingTimes]);

  return (
    <div className="h-full w-full relative bg-gray-100" ref={containerRef}>
      <canvas ref={canvasRef} className="w-full h-full" />

      {selectedRoute && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-4 py-2 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Route</p>
          <p className="font-semibold text-gray-900">{selectedRoute.title}</p>
        </div>
      )}
    </div>
  );
}
