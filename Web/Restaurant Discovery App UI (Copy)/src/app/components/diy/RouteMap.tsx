import { useEffect, useRef } from 'react';
import { WishlistLocation } from './WishlistItem';

interface RouteMapProps {
  itinerary: WishlistLocation[];
  walkingTimes: string[];
}

export default function RouteMap({ itinerary, walkingTimes }: RouteMapProps) {
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
    if (!canvas || !container || itinerary.length === 0) return;

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
    const padding = 60;

    const lats = itinerary.map(loc => loc.lat);
    const lngs = itinerary.map(loc => loc.lng);
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
      const points = itinerary.map(loc => ({
        x: lngToX(loc.lng, paddedMinLng, paddedMaxLng, width - padding * 2) + padding,
        y: latToY(loc.lat, paddedMinLat, paddedMaxLat, height - padding * 2) + padding,
      }));

      if (points.length > 1) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([8, 8]);

        ctx.shadowColor = 'rgba(239, 68, 68, 0.3)';
        ctx.shadowBlur = 6;
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
        ctx.setLineDash([]);

        for (let i = 0; i < points.length - 1; i++) {
          const midX = (points[i].x + points[i + 1].x) / 2;
          const midY = (points[i].y + points[i + 1].y) / 2;

          const text = walkingTimes[i] || '5 mins walk';
          ctx.font = '600 11px sans-serif';
          const textWidth = ctx.measureText(text).width;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = 'white';
          ctx.fillRect(midX - textWidth / 2 - 6, midY - 10, textWidth + 12, 20);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#6b7280';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, midX, midY);
        }
      }

      itinerary.forEach((loc, index) => {
        const x = lngToX(loc.lng, paddedMinLng, paddedMaxLng, width - padding * 2) + padding;
        const y = latToY(loc.lat, paddedMinLat, paddedMaxLat, height - padding * 2) + padding;

        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), x, y);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'white';
        ctx.font = '600 12px sans-serif';
        const nameWidth = ctx.measureText(loc.name).width;
        ctx.fillRect(x - nameWidth / 2 - 8, y - 32, nameWidth + 16, 22);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1f2937';
        ctx.fillText(loc.name, x, y - 21);
      });
    };

    if (tilesToLoad === 0) {
      drawRoute();
    }

  }, [itinerary, walkingTimes]);

  if (itinerary.length === 0) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Your route will appear here</p>
          <p className="text-gray-400 text-sm mt-2">Add stops to your itinerary to see the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-gray-100" ref={containerRef}>
      <canvas ref={canvasRef} className="w-full h-full" />

      {itinerary.length > 0 && (
        <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-4 py-2.5 border border-gray-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="font-semibold text-gray-900 uppercase tracking-wide text-sm">South Bank, Brisbane</span>
        </div>
      )}
    </div>
  );
}
