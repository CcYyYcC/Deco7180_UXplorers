import { useDrop } from 'react-dnd';
import { Plus } from 'lucide-react';
import { WishlistLocation } from './WishlistItem';

interface ItineraryDropZoneProps {
  onDrop: (location: WishlistLocation) => void;
  isEmpty: boolean;
}

export default function ItineraryDropZone({ onDrop, isEmpty }: ItineraryDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'WISHLIST_ITEM',
    drop: (item: WishlistLocation) => {
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`border-2 border-dashed rounded-lg p-6 transition-all ${
        isOver && canDrop
          ? 'border-blue-500 bg-blue-50'
          : canDrop
          ? 'border-gray-300 bg-gray-50'
          : 'border-gray-300 bg-gray-50'
      }`}
    >
      <div className="text-center">
        <Plus className={`w-8 h-8 mx-auto mb-2 ${isOver && canDrop ? 'text-blue-600' : 'text-gray-400'}`} />
        <p className={`text-sm ${isOver && canDrop ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
          {isEmpty ? 'Drag spots here to start your journey' : 'Drop here to add another stop'}
        </p>
      </div>
    </div>
  );
}
