import { Star, Clock, MapPin, ShieldCheck } from 'lucide-react';

export interface Restaurant {
  id: number;
  name: string;
  image: string;
  rating: number;
  safetyScore: number;
  category: string;
  priceLevel: string;
  distance: string;
  openNow: boolean;
  forLunch: boolean;
  address: string;
  lat: number;
  lng: number;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onClick: () => void;
}

export default function RestaurantCard({ restaurant, isSelected, onClick }: RestaurantCardProps) {
  const getSafetyColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 3.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSafetyBadgeColor = (score: number) => {
    if (score >= 4.5) return 'bg-green-500';
    if (score >= 3.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-sm'
      }`}
    >
      <div className="relative">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
          <ShieldCheck className={`w-4 h-4 ${getSafetyBadgeColor(restaurant.safetyScore)} text-white rounded-full p-0.5`} />
          <span className="text-sm font-semibold">{restaurant.safetyScore.toFixed(1)}</span>
        </div>
        {restaurant.openNow && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-2.5 py-1 rounded-lg text-xs font-medium shadow-md">
            Open Now
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{restaurant.name}</h3>
          <span className="text-gray-600 whitespace-nowrap text-sm">{restaurant.priceLevel}</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-gray-900">{restaurant.rating.toFixed(1)}</span>
          </div>
          <span className="text-gray-300">•</span>
          <span className="text-sm text-gray-600">{restaurant.category}</span>
          <span className="text-gray-300">•</span>
          <span className="text-sm text-gray-600">{restaurant.distance}</span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getSafetyColor(restaurant.safetyScore)}`}>
          <ShieldCheck className="w-4 h-4" />
          <span className="text-sm font-medium">
            {restaurant.safetyScore >= 4.5 ? 'Excellent' : restaurant.safetyScore >= 3.5 ? 'Good' : 'Fair'} Food Safety
          </span>
          <div className="flex gap-0.5 ml-auto">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(restaurant.safetyScore)
                    ? 'fill-current text-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="text-sm line-clamp-1">{restaurant.address}</span>
        </div>
      </div>
    </div>
  );
}
