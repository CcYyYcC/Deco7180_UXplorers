import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import FilterPanel from './FilterPanel';

interface SearchBarProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  searchQuery: string;
  safetyRating: 'all' | '3+' | '4+' | '5';
  category: string;
  openNow: boolean;
  forLunch: boolean;
  priceLevel?: string;
  distance?: string;
  safetyImportance?: number;
}

export default function SearchBar({ onFilterChange }: SearchBarProps) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
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

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const activeFilterCount = [
    filters.safetyRating !== 'all',
    filters.category !== 'all',
    filters.openNow,
    filters.forLunch,
    filters.priceLevel !== 'all',
    filters.distance !== 'all',
  ].filter(Boolean).length;

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search restaurants..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowFilterPanel(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5 text-gray-600" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <FilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        currentFilters={filters}
        onApply={handleApplyFilters}
      />
    </>
  );
}
