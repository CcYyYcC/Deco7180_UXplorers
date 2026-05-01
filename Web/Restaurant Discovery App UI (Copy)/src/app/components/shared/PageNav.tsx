import { Search, Route, Sparkles } from 'lucide-react';

interface PageNavProps {
  currentPage: 'discovery' | 'recommended' | 'diy';
  onPageChange: (page: 'discovery' | 'recommended' | 'diy') => void;
}

export default function PageNav({ currentPage, onPageChange }: PageNavProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
      <button
        onClick={() => onPageChange('discovery')}
        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
          currentPage === 'discovery'
            ? 'bg-blue-500 text-white shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
        }`}
      >
        <Search className="w-4 h-4" />
        Restaurant Discovery
      </button>
      <button
        onClick={() => onPageChange('recommended')}
        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
          currentPage === 'recommended'
            ? 'bg-blue-500 text-white shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        Recommended Routes
      </button>
      <button
        onClick={() => onPageChange('diy')}
        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
          currentPage === 'diy'
            ? 'bg-blue-500 text-white shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
        }`}
      >
        <Route className="w-4 h-4" />
        DIY Route Studio
      </button>
    </div>
  );
}
