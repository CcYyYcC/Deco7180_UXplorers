import { X, Clock } from 'lucide-react';
import { WishlistLocation } from './WishlistItem';

interface ItineraryItemProps {
  location: WishlistLocation;
  index: number;
  estimatedWait: string;
  onRemove: () => void;
}

export default function ItineraryItem({ location, index, estimatedWait, onRemove }: ItineraryItemProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-300 p-3 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
            {location.name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5" />
            <span>{estimatedWait} wait</span>
            <span className="text-gray-400">•</span>
            <span>{location.category}</span>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1.5 hover:bg-red-50 rounded-full transition-colors group"
        >
          <X className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
        </button>
      </div>
    </div>
  );
}
