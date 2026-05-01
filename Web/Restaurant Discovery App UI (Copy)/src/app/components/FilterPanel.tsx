import { X, Star, ShieldCheck, DollarSign, MapPin, Clock, Utensils } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FilterState } from './SearchBar';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: Utensils },
  { id: 'bbq', label: 'BBQ', icon: Utensils },
  { id: 'seafood', label: 'Seafood', icon: Utensils },
  { id: 'italian', label: 'Italian', icon: Utensils },
  { id: 'mexican', label: 'Mexican', icon: Utensils },
  { id: 'asian', label: 'Asian', icon: Utensils },
  { id: 'cafe', label: 'Cafe', icon: Utensils },
];

const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$'];

export default function FilterPanel({ isOpen, onClose, currentFilters, onApply }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters, isOpen]);

  const handleClearAll = () => {
    const clearedFilters: FilterState = {
      searchQuery: filters.searchQuery,
      safetyRating: 'all',
      category: 'all',
      openNow: false,
      forLunch: false,
      priceLevel: 'all',
      distance: 'all',
      safetyImportance: 50,
    };
    setFilters(clearedFilters);
  };

  const getImportanceLabel = (value: number) => {
    if (value <= 25) return 'Low';
    if (value <= 50) return 'Medium';
    if (value <= 75) return 'High';
    return 'Critical';
  };

  const getImportanceColor = (value: number) => {
    if (value <= 25) return 'from-gray-400 to-gray-500';
    if (value <= 50) return 'from-blue-400 to-blue-500';
    if (value <= 75) return 'from-orange-400 to-orange-500';
    return 'from-red-500 to-red-600';
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const activeFilterCount = [
    filters.safetyRating !== 'all',
    filters.category !== 'all',
    filters.openNow,
    filters.forLunch,
    filters.priceLevel !== 'all',
    filters.distance !== 'all',
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
            {activeFilterCount > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">{activeFilterCount} active</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Food Safety Rating</h3>
              </div>
              <div className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                Priority Filter
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Filter restaurants by their food safety inspection score
            </p>
            <div className="grid grid-cols-4 gap-3">
              {['all', '3+', '4+', '5'].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFilters({ ...filters, safetyRating: rating as FilterState['safetyRating'] })}
                  className={`flex flex-col items-center justify-center py-4 px-3 rounded-xl border-2 transition-all ${
                    filters.safetyRating === rating
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {rating === 'all' ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <Star className="w-5 h-5 text-gray-600" />
                      </div>
                      <span className={`text-sm font-medium ${
                        filters.safetyRating === rating ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        All
                      </span>
                    </>
                  ) : (
                    <>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        filters.safetyRating === rating
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}>
                        <Star className={`w-5 h-5 ${
                          filters.safetyRating === rating
                            ? 'text-blue-600 fill-blue-600'
                            : 'text-gray-600'
                        }`} />
                      </div>
                      <span className={`text-sm font-medium ${
                        filters.safetyRating === rating ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {rating}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Safety Importance</h3>
                    <p className="text-xs text-gray-600">Adjust how we prioritize food safety</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getImportanceColor(filters.safetyImportance || 50)} text-white font-bold shadow-lg`}>
                  {getImportanceLabel(filters.safetyImportance || 50)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.safetyImportance || 50}
                    onChange={(e) => setFilters({ ...filters, safetyImportance: parseInt(e.target.value) })}
                    className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right,
                        #60a5fa ${filters.safetyImportance || 50}%,
                        #e5e7eb ${filters.safetyImportance || 50}%)`
                    }}
                  />
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-gray-600 font-medium">Low Priority</span>
                    <span className="text-gray-600 font-medium">High Priority</span>
                  </div>
                </div>

                <div className="bg-white/70 rounded-lg p-3 text-sm text-gray-700">
                  <p className="leading-relaxed">
                    {(filters.safetyImportance || 50) <= 25 && (
                      <span>
                        <strong>Low importance:</strong> Food safety is considered but other factors like price and rating have more weight.
                      </span>
                    )}
                    {(filters.safetyImportance || 50) > 25 && (filters.safetyImportance || 50) <= 50 && (
                      <span>
                        <strong>Medium importance:</strong> Food safety is balanced with other factors in recommendations.
                      </span>
                    )}
                    {(filters.safetyImportance || 50) > 50 && (filters.safetyImportance || 50) <= 75 && (
                      <span>
                        <strong>High importance:</strong> Food safety is prioritized over most other factors.
                      </span>
                    )}
                    {(filters.safetyImportance || 50) > 75 && (
                      <span>
                        <strong>Critical importance:</strong> Only restaurants with excellent safety scores will be recommended.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Category</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilters({ ...filters, category: cat.id })}
                  className={`px-4 py-2.5 rounded-full border transition-all ${
                    filters.category === cat.id
                      ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm'
                  }`}
                >
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Availability</h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={filters.openNow}
                  onChange={(e) => setFilters({ ...filters, openNow: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 block">Open Now</span>
                  <span className="text-xs text-gray-500">Currently accepting customers</span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={filters.forLunch}
                  onChange={(e) => setFilters({ ...filters, forLunch: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 block">Open for Lunch</span>
                  <span className="text-xs text-gray-500">Serves lunch (11am - 3pm)</span>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Price Range</h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => setFilters({ ...filters, priceLevel: 'all' })}
                className={`py-3 px-2 rounded-lg border transition-all text-sm font-medium ${
                  filters.priceLevel === 'all'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                All
              </button>
              {PRICE_LEVELS.map((price) => (
                <button
                  key={price}
                  onClick={() => setFilters({ ...filters, priceLevel: price })}
                  className={`py-3 px-2 rounded-lg border transition-all text-sm font-medium ${
                    filters.priceLevel === price
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {price}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Distance</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['all', '0.5', '1', '2', '5', '10'].map((dist) => (
                <button
                  key={dist}
                  onClick={() => setFilters({ ...filters, distance: dist })}
                  className={`py-3 px-4 rounded-lg border transition-all ${
                    filters.distance === dist
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {dist === 'all' ? 'Any distance' : `${dist} mi`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={handleClearAll}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
