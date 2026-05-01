interface SavedSpotProps {
  name: string;
  category: string;
}

export default function SavedSpot({ name, category }: SavedSpotProps) {
  return (
    <div className="py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded">
      <p className="text-sm font-medium text-gray-900">{name}</p>
      <p className="text-xs text-gray-500">{category}</p>
    </div>
  );
}
