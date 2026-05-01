import { useState, useMemo } from 'react';
import SearchBar, { FilterState } from './components/SearchBar';
import RestaurantList from './components/RestaurantList';
import MapView from './components/MapView';
import { Restaurant } from './components/RestaurantCard';
import DIYRouteEditor from './components/diy/DIYRouteEditor';
import RecommendedRoutes from './components/recommended/RecommendedRoutes';
import PageNav from './components/shared/PageNav';

const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 1,
    name: "The Golden Fork",
    image: "https://images.unsplash.com/photo-1739792598744-3512897156e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.8,
    safetyScore: 5.0,
    category: "Italian",
    priceLevel: "$$",
    distance: "0.3 mi",
    openNow: true,
    forLunch: true,
    address: "123 Queen St, Brisbane CBD",
    lat: -27.4698,
    lng: 153.0251,
  },
  {
    id: 2,
    name: "Ocean's Bounty",
    image: "https://images.unsplash.com/photo-1658396882274-94657102c65b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.6,
    safetyScore: 4.8,
    category: "Seafood",
    priceLevel: "$$$",
    distance: "0.5 mi",
    openNow: true,
    forLunch: true,
    address: "456 Eagle St, Brisbane CBD",
    lat: -27.4680,
    lng: 153.0290,
  },
  {
    id: 3,
    name: "BBQ Heaven",
    image: "https://images.unsplash.com/photo-1647109063447-e01ab743ee8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.7,
    safetyScore: 4.5,
    category: "BBQ",
    priceLevel: "$$",
    distance: "0.7 mi",
    openNow: true,
    forLunch: true,
    address: "789 Adelaide St, Brisbane CBD",
    lat: -27.4710,
    lng: 153.0230,
  },
  {
    id: 4,
    name: "Taco Paradise",
    image: "https://images.unsplash.com/photo-1619626477638-8f06f5d99e6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw2fHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.4,
    safetyScore: 4.2,
    category: "Mexican",
    priceLevel: "$",
    distance: "1.2 mi",
    openNow: false,
    forLunch: false,
    address: "321 Charlotte St, Brisbane CBD",
    lat: -27.4665,
    lng: 153.0270,
  },
  {
    id: 5,
    name: "Sushi Master",
    image: "https://images.unsplash.com/photo-1705648341120-666923f8b675?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw4fHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.9,
    safetyScore: 5.0,
    category: "Asian",
    priceLevel: "$$$",
    distance: "0.4 mi",
    openNow: true,
    forLunch: true,
    address: "555 Edward St, Brisbane CBD",
    lat: -27.4690,
    lng: 153.0260,
  },
  {
    id: 6,
    name: "The Breakfast Club",
    image: "https://images.unsplash.com/photo-1562234136-4d570697ead2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw5fHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.3,
    safetyScore: 4.0,
    category: "Cafe",
    priceLevel: "$",
    distance: "0.9 mi",
    openNow: true,
    forLunch: true,
    address: "888 Albert St, Brisbane CBD",
    lat: -27.4705,
    lng: 153.0245,
  },
  {
    id: 7,
    name: "Mediterranean Dreams",
    image: "https://images.unsplash.com/photo-1767778080869-4b82b5924c3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxMHx8cmVzdGF1cmFudCUyMGZvb2QlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzY2NDc3NDJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.5,
    safetyScore: 4.6,
    category: "Italian",
    priceLevel: "$$",
    distance: "1.5 mi",
    openNow: true,
    forLunch: false,
    address: "999 Grey St, South Bank",
    lat: -27.4795,
    lng: 153.0185,
  },
  {
    id: 8,
    name: "Spice Route",
    image: "https://images.unsplash.com/photo-1619626591670-194ba6c6ffb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw3fHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.2,
    safetyScore: 3.8,
    category: "Asian",
    priceLevel: "$$",
    distance: "2.1 mi",
    openNow: false,
    forLunch: true,
    address: "777 Stanley St, South Bank",
    lat: -27.4810,
    lng: 153.0200,
  },
  {
    id: 9,
    name: "Lobster Shack",
    image: "https://images.unsplash.com/photo-1658396899356-d73fad352bee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.6,
    safetyScore: 4.7,
    category: "Seafood",
    priceLevel: "$$$",
    distance: "1.8 mi",
    openNow: true,
    forLunch: true,
    address: "444 Riverside Dr, South Bank",
    lat: -27.4780,
    lng: 153.0210,
  },
  {
    id: 10,
    name: "The Smoke House",
    image: "https://images.unsplash.com/photo-1658396927254-4efdbb41aed3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxyZXN0YXVyYW50JTIwZm9vZCUyMGludGVyaW9yfGVufDF8fHx8MTc3NjY0Nzc0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.1,
    safetyScore: 3.5,
    category: "BBQ",
    priceLevel: "$",
    distance: "2.5 mi",
    openNow: true,
    forLunch: false,
    address: "222 Little Stanley St, South Bank",
    lat: -27.4820,
    lng: 153.0165,
  },
];

export default function App() {
  const [currentView, setCurrentView] = useState<'discovery' | 'diy' | 'recommended'>('discovery');
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    safetyRating: 'all',
    category: 'all',
    openNow: false,
    forLunch: false,
    priceLevel: 'all',
    distance: 'all',
    safetyImportance: 50,
  });
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);

  const filteredRestaurants = useMemo(() => {
    return MOCK_RESTAURANTS.filter((restaurant) => {
      if (filters.searchQuery && !restaurant.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }

      if (filters.safetyRating !== 'all') {
        const minRating = filters.safetyRating === '5' ? 5 :
                          filters.safetyRating === '4+' ? 4 : 3;
        if (restaurant.safetyScore < minRating) {
          return false;
        }
      }

      if (filters.category !== 'all' && restaurant.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }

      if (filters.openNow && !restaurant.openNow) {
        return false;
      }

      if (filters.forLunch && !restaurant.forLunch) {
        return false;
      }

      if (filters.priceLevel && filters.priceLevel !== 'all' && restaurant.priceLevel !== filters.priceLevel) {
        return false;
      }

      if (filters.distance && filters.distance !== 'all') {
        const maxDistance = parseFloat(filters.distance);
        const restaurantDistance = parseFloat(restaurant.distance.replace(' mi', ''));
        if (restaurantDistance > maxDistance) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  if (currentView === 'diy') {
    return (
      <div className="size-full flex flex-col bg-gray-50">
        <PageNav currentPage="diy" onPageChange={setCurrentView} />
        <DIYRouteEditor />
      </div>
    );
  }

  if (currentView === 'recommended') {
    return (
      <div className="size-full flex flex-col bg-gray-50">
        <PageNav currentPage="recommended" onPageChange={setCurrentView} />
        <RecommendedRoutes />
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <PageNav currentPage="discovery" onPageChange={setCurrentView} />
      <SearchBar onFilterChange={setFilters} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-1/2 lg:w-2/5">
          <RestaurantList
            restaurants={filteredRestaurants}
            selectedId={selectedRestaurantId}
            onSelectRestaurant={setSelectedRestaurantId}
          />
        </div>

        <div className="hidden md:block md:w-1/2 lg:w-3/5 border-l border-gray-200">
          <MapView
            restaurants={filteredRestaurants}
            selectedId={selectedRestaurantId}
            onSelectRestaurant={setSelectedRestaurantId}
          />
        </div>
      </div>
    </div>
  );
}
