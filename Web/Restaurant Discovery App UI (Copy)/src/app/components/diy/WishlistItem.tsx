import { GripVertical, Star } from 'lucide-react';
import { useDrag } from 'react-dnd';

export interface WishlistLocation {
  id: string;
  name: string;
  image: string;
  safetyScore: string;
  safetyGrade: string;
  priceLevel: string;
  category: string;
  lat: number;
  lng: number;
}

interface WishlistItemProps {
  location: WishlistLocation;
}

export default function WishlistItem({ location }: WishlistItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'WISHLIST_ITEM',
    item: location,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <GripVertical className="w-5 h-5 text-gray-400 mt-1" />
        </div>
        <img
          src={location.image}
          alt={location.name}
          className="w-16 h-16 rounded-md object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm truncate mb-1">
            {location.name}
          </h4>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {location.safetyGrade} / {location.safetyScore}
            </span>
            <span className="text-xs text-gray-600">{location.priceLevel}</span>
          </div>
          <p className="text-xs text-gray-500">{location.category}</p>
        </div>
      </div>
    </div>
  );
}
