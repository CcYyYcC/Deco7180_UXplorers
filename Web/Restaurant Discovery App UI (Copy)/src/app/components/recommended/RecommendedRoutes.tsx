import { useState } from 'react';
import { Search, Heart, Users, User as UserIcon } from 'lucide-react';
import RouteCard, { RouteInfo } from './RouteCard';
import SavedSpot from './SavedSpot';
import RecommendedRouteMap from './RecommendedRouteMap';

const MOCK_ROUTES: RouteInfo[] = [
  {
    id: '1',
    title: 'South Bank Feast',
    distance: '2.3 km',
    priceLevel: '$$$',
    safetyScore: 95,
    spots: [
      { name: 'The Coffee Club', lat: -27.4750, lng: 153.0220 },
      { name: 'Stokehouse Q', lat: -27.4785, lng: 153.0195 },
      { name: 'Fish Lane Dining', lat: -27.4795, lng: 153.0185 },
    ],
  },
  {
    id: '2',
    title: 'Riverside Delights',
    distance: '3.1 km',
    priceLevel: '$$$$',
    safetyScore: 92,
    spots: [
      { name: 'River Quay', lat: -27.4770, lng: 153.0230 },
      { name: 'Plough Inn', lat: -27.4800, lng: 153.0175 },
      { name: 'Southbank Beer Garden', lat: -27.4810, lng: 153.0200 },
    ],
  },
  {
    id: '3',
    title: 'Cultural District Tour',
    distance: '1.8 km',
    priceLevel: '$$',
    safetyScore: 88,
    spots: [
      { name: 'GOMA Cafe', lat: -27.4760, lng: 153.0170 },
      { name: 'State Library Cafe', lat: -27.4698, lng: 153.0251 },
      { name: 'Museum Bistro', lat: -27.4705, lng: 153.0245 },
    ],
  },
];

const SAVED_SPOTS = [
  { name: 'The Coffee Club', category: 'Cafe' },
  { name: 'Stokehouse Q', category: 'Restaurant' },
  { name: 'Fish Lane Dining', category: 'Bar & Grill' },
];

export default function RecommendedRoutes() {
  const [mode, setMode] = useState<'solo' | 'group'>('solo');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(MOCK_ROUTES[0].id);

  const selectedRoute = MOCK_ROUTES.find(r => r.id === selectedRouteId) || null;

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Food Journey</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search destinations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 bg-white border-r border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Travel Mode
              </h2>
              <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
                <button
                  onClick={() => setMode('solo')}
                  className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                    mode === 'solo'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  Solo Mode
                </button>
                <button
                  onClick={() => setMode('group')}
                  className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                    mode === 'group'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Group Mode
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                Saved Spots
              </h2>
              <div className="space-y-1">
                {SAVED_SPOTS.map((spot, index) => (
                  <SavedSpot key={index} name={spot.name} category={spot.category} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Recommended Routes
              </h2>
              <div className="space-y-3">
                {MOCK_ROUTES.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    isSelected={selectedRouteId === route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    onEdit={() => console.log('Edit route:', route.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-gray-100">
          <RecommendedRouteMap
            selectedRoute={selectedRoute}
            walkingTimes={['8 mins walk', '6 mins walk']}
          />
        </main>
      </div>
    </div>
  );
}
