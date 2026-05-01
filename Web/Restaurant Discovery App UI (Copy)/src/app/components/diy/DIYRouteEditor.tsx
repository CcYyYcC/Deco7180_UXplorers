import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Search, Globe, User, Route, DollarSign, Clock } from 'lucide-react';
import WishlistItem, { WishlistLocation } from './WishlistItem';
import ItineraryItem from './ItineraryItem';
import ItineraryDropZone from './ItineraryDropZone';
import RouteMap from './RouteMap';

const MOCK_WISHLIST: WishlistLocation[] = [
  {
    id: '1',
    name: 'Fish Lane Dining',
    image: 'https://images.unsplash.com/photo-1739792598744-3512897156e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    safetyScore: '88%',
    safetyGrade: 'B',
    priceLevel: '$$$',
    category: 'Bar & Grill',
    lat: -27.4795,
    lng: 153.0185,
  },
  {
    id: '2',
    name: 'Southbank Beer Garden',
    image: 'https://images.unsplash.com/photo-1658396882274-94657102c65b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    safetyScore: '96%',
    safetyGrade: 'A',
    priceLevel: '$$',
    category: 'Restaurant',
    lat: -27.4810,
    lng: 153.0200,
  },
  {
    id: '3',
    name: 'Sushi Koto',
    image: 'https://images.unsplash.com/photo-1647109063447-e01ab743ee8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    safetyScore: '98%',
    safetyGrade: 'A',
    priceLevel: '$$$$',
    category: 'Japanese',
    lat: -27.4780,
    lng: 153.0210,
  },
  {
    id: '4',
    name: 'The Coffee Club',
    image: 'https://images.unsplash.com/photo-1705648341120-666923f8b675?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    safetyScore: '92%',
    safetyGrade: 'A',
    priceLevel: '$$',
    category: 'Cafe',
    lat: -27.4750,
    lng: 153.0220,
  },
];

const ESTIMATED_WAITS = ['15 min', '20 min', '10 min', '25 min'];
const WALKING_TIMES = ['10 mins walk', '12 mins walk', '6 mins walk'];

export default function DIYRouteEditor() {
  const [itinerary, setItinerary] = useState<WishlistLocation[]>([
    MOCK_WISHLIST[0],
    MOCK_WISHLIST[1],
  ]);

  const handleDrop = (location: WishlistLocation) => {
    if (!itinerary.find(item => item.id === location.id)) {
      setItinerary([...itinerary, location]);
    }
  };

  const handleRemove = (index: number) => {
    setItinerary(itinerary.filter((_, i) => i !== index));
  };

  const handleClearRoute = () => {
    setItinerary([]);
  };

  const calculateTotalDistance = () => {
    if (itinerary.length < 2) return '0 km';
    return `${(itinerary.length - 1) * 1.2} km`;
  };

  const calculateTotalTime = () => {
    if (itinerary.length === 0) return '0h 0m';
    const walkTime = (itinerary.length - 1) * 8;
    const waitTime = itinerary.reduce((sum, _, idx) => {
      const wait = parseInt(ESTIMATED_WAITS[idx % ESTIMATED_WAITS.length]);
      return sum + wait;
    }, 0);
    const totalMinutes = walkTime + waitTime;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const calculatePriceLevel = () => {
    if (itinerary.length === 0) return '$';
    const avgPrice = itinerary.reduce((sum, loc) => sum + loc.priceLevel.length, 0) / itinerary.length;
    return '$'.repeat(Math.ceil(avgPrice));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex-1 flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                DIY Route Studio: <span className="text-blue-600">Plan Your Journey Manually</span>
              </h1>
              <div className="flex items-center gap-4">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Globe className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <User className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search South Bank..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-96 bg-white border-r border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  1. My Wishlist (Saved Spots)
                </h2>
                <div className="space-y-3">
                  {MOCK_WISHLIST.map((location) => (
                    <WishlistItem key={location.id} location={location} />
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  2. Your Itinerary / Stop Order
                </h2>
                <div className="space-y-3">
                  {itinerary.map((location, index) => (
                    <ItineraryItem
                      key={`${location.id}-${index}`}
                      location={location}
                      index={index}
                      estimatedWait={ESTIMATED_WAITS[index % ESTIMATED_WAITS.length]}
                      onRemove={() => handleRemove(index)}
                    />
                  ))}
                  <ItineraryDropZone onDrop={handleDrop} isEmpty={itinerary.length === 0} />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-white p-6">
              <div className="bg-green-50 rounded-xl border border-green-200 p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-green-600" />
                  Live Itinerary Summary
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide block mb-1">Total Distance</span>
                    <span className="text-lg font-bold text-gray-900">{calculateTotalDistance()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide block mb-1">Est. Walking</span>
                    <span className="text-lg font-bold text-gray-900">{calculateTotalTime()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide block mb-1">Price Level</span>
                    <span className="text-lg font-bold text-gray-900">{calculatePriceLevel()}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearRoute}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Clear Route
                  </button>
                  <button
                    disabled={itinerary.length === 0}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Confirm Itinerary
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 bg-gray-100">
            <RouteMap itinerary={itinerary} walkingTimes={WALKING_TIMES} />
          </main>
        </div>
      </div>
    </DndProvider>
  );
}
