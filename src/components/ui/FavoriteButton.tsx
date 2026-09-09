// components/ui/FavoriteButton.tsx
'use client';

import { Heart } from 'lucide-react';

type FavoriteButtonProps = {
  productId: string;
  isFavorite: boolean;
  onToggle: () => void;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export default function FavoriteButton({
  productId,
  isFavorite,
  onToggle,
  loading = false,
  size = 'md',
  className = '',
}: FavoriteButtonProps) {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const iconSize = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className={`
        absolute z-20 rounded-full bg-white/90 backdrop-blur-sm shadow-lg 
        hover:shadow-xl transition-all hover:scale-110
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]} ${className}
      `}
      title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart
        className={`
          transition-all duration-300
          ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700 hover:text-red-400'}
          ${iconSize[size]}
        `}
      />
    </button>
  );
}