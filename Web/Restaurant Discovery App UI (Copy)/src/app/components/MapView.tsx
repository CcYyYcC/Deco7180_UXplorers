import { useEffect, useRef } from 'react';
import { Restaurant } from './RestaurantCard';
import { MapPin, Star, ShieldCheck } from 'lucide-react';

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: number | null;
  onSelectRestaurant: (id: number) => void;
}

export default function MapView({ restaurants, selectedId, onSelectRestaurant }: MapViewProps) {
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
    if (!canvas || !container || restaurants.length === 0) return;

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

    const padding = 50;
    const lats = restaurants.map(r => r.lat);
    const lngs = restaurants.map(r => r.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;
    const paddedMinLat = minLat - latRange * 0.1;
    const paddedMaxLat = maxLat + latRange * 0.1;
    const paddedMinLng = minLng - lngRange * 0.1;
    const paddedMaxLng = maxLng + lngRange * 0.1;

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

    ctx.fillStyle = '#e8f4f8';
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
          ctx.drawImage(img, x, y, tileSize, tileSize);
          loadedTiles[tileKey] = true;

          if (Object.keys(loadedTiles).length === tilesToLoad) {
            drawMarkers();
          }
        };
        img.onerror = () => {
          ctx.fillStyle = '#d1d5db';
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, tileSize, tileSize);
          loadedTiles[tileKey] = true;

          if (Object.keys(loadedTiles).length === tilesToLoad) {
            drawMarkers();
          }
        };
        img.src = tileUrl;
      }
    }

    const drawMarkers = () => {

      const selectedRestaurant = restaurants.find(r => r.id === selectedId);

      restaurants.forEach((restaurant) => {
        const x = lngToX(restaurant.lng, paddedMinLng, paddedMaxLng, width - padding * 2) + padding;
        const y = latToY(restaurant.lat, paddedMinLat, paddedMaxLat, height - padding * 2) + padding;

        const isSelected = restaurant.id === selectedId;
        const radius = isSelected ? 20 : 14;

        const getSafetyColor = (score: number) => {
          if (score >= 4.5) return '#22c55e';
          if (score >= 3.5) return '#eab308';
          return '#ef4444';
        };

        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = isSelected ? 12 : 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = getSafetyColor(restaurant.safetyScore);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = `bold ${isSelected ? 11 : 9}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(restaurant.safetyScore.toFixed(1), x, y);

        if (isSelected) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = 'white';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          const textWidth = ctx.measureText(restaurant.name).width;
          ctx.fillRect(x - textWidth / 2 - 6, y - radius - 28, textWidth + 12, 20);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#1f2937';
          ctx.fillText(restaurant.name, x, y - radius - 18);
        }
      });
    };

    if (tilesToLoad === 0) {
      drawMarkers();
    }

  }, [restaurants, selectedId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || restaurants.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const padding = 50;

    const lats = restaurants.map(r => r.lat);
    const lngs = restaurants.map(r => r.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;
    const paddedMinLat = minLat - latRange * 0.1;
    const paddedMaxLat = maxLat + latRange * 0.1;
    const paddedMinLng = minLng - lngRange * 0.1;
    const paddedMaxLng = maxLng + lngRange * 0.1;

    for (const restaurant of restaurants) {
      const markerX = lngToX(restaurant.lng, paddedMinLng, paddedMaxLng, width - padding * 2) + padding;
      const markerY = latToY(restaurant.lat, paddedMinLat, paddedMaxLat, height - padding * 2) + padding;

      const distance = Math.sqrt(Math.pow(x - markerX, 2) + Math.pow(y - markerY, 2));
      const radius = restaurant.id === selectedId ? 20 : 14;

      if (distance <= radius) {
        onSelectRestaurant(restaurant.id);
        break;
      }
    }
  };

  const selectedRestaurant = restaurants.find(r => r.id === selectedId);

  return (
    <div className="h-full w-full relative bg-gray-100" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
      />

      {selectedRestaurant && (
        <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl shadow-lg p-4 max-w-sm">
          <div className="flex gap-3">
            <img
              src={selectedRestaurant.image}
              alt={selectedRestaurant.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                {selectedRestaurant.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{selectedRestaurant.rating.toFixed(1)}</span>
                </div>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600">{selectedRestaurant.category}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <ShieldCheck className={`w-4 h-4 ${
                  selectedRestaurant.safetyScore >= 4.5 ? 'text-green-600' :
                  selectedRestaurant.safetyScore >= 3.5 ? 'text-yellow-600' : 'text-red-600'
                }`} />
                <span className="font-medium">
                  Safety: {selectedRestaurant.safetyScore.toFixed(1)}/5.0
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{selectedRestaurant.address}</p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-xs text-gray-600">
        <MapPin className="w-4 h-4 inline mr-1" />
        Click markers to view details
      </div>
    </div>
  );
}
