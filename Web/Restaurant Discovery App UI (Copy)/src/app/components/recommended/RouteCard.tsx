import { Edit2, Navigation } from 'lucide-react';

export interface RouteInfo {
  id: string;
  title: string;
  distance: string;
  priceLevel: string;
  safetyScore: number;
  spots: Array<{
    name: string;
    lat: number;
    lng: number;
  }>;
}

interface RouteCardProps {
  route: RouteInfo;
  onEdit: () => void;
  isSelected: boolean;
  onClick: () => void;
}

export default function RouteCard({ route, onEdit, isSelected, onClick }: RouteCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-lg'
          : 'border border-gray-200 hover:shadow-md'
      }`}
    >
      <h3 className="font-semibold text-gray-900 mb-3">{route.title}</h3>

      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Navigation className="w-4 h-4" />
          <span>{route.distance}</span>
        </div>
        <span className="font-medium">{route.priceLevel}</span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Food Safety Score</span>
          <span className="text-sm font-bold text-gray-900">{route.safetyScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all"
            style={{ width: `${route.safetyScore}%` }}
          />
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        <Edit2 className="w-4 h-4" />
        Edit / Customize
      </button>
    </div>
  );
}
