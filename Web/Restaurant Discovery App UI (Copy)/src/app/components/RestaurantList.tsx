import RestaurantCard, { Restaurant } from './RestaurantCard';

interface RestaurantListProps {
  restaurants: Restaurant[];
  selectedId: number | null;
  onSelectRestaurant: (id: number) => void;
}

export default function RestaurantList({ restaurants, selectedId, onSelectRestaurant }: RestaurantListProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 space-y-3">
        {restaurants.length > 0 ? (
          <>
            <p className="text-sm text-gray-600 font-medium">
              {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found
            </p>
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                isSelected={selectedId === restaurant.id}
                onClick={() => onSelectRestaurant(restaurant.id)}
              />
            ))}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No restaurants found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
