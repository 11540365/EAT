import React from 'react';
import type { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  isFavorite: boolean;
  onToggleFavorite: (restaurant: Restaurant) => void;
}

const MapPinIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
);

const StarIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg className="w-5 h-5" fill={color} viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const StarRating: React.FC<{ rating: string }> = ({ rating }) => {
    const numericRating = parseFloat(rating) || 0;
    const stars = Array.from({ length: 5 }, (_, i) => {
        if (numericRating >= i + 1) {
            return <StarIcon key={i} color="currentColor" />;
        }
        if (numericRating >= i + 0.5) {
            return <StarIcon key={i} color="currentColor" />;
        }
        return <StarIcon key={i} color="#e5e7eb" />;
    });

    return <div className="flex items-center text-yellow-400">{stars} <span className="text-stone-500 text-sm ml-2 font-medium">{rating}</span></div>;
};


export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, isFavorite, onToggleFavorite }) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleFavorite(restaurant);
  };

  // Fallback to a random high-quality food image if load fails
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const backups = [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
        "https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80",
        "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80"
    ];
    e.currentTarget.src = backups[Math.floor(Math.random() * backups.length)];
    e.currentTarget.onerror = null;
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl flex flex-col relative h-full border border-stone-100">
      <button 
        onClick={handleFavoriteClick}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white bg-opacity-80 backdrop-blur-sm hover:bg-white transition-all shadow-sm"
        aria-label={isFavorite ? '移除最愛' : '加入最愛'}
        >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-colors duration-300" viewBox="0 0 24 24" stroke={isFavorite ? '#ef4444' : '#9ca3af'} strokeWidth="2" fill={isFavorite ? '#ef4444' : 'none'}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 18.727l-7.682-7.682a4.5 4.5 0 010-6.364z" />
        </svg>
      </button>
      <div className="relative h-48 w-full overflow-hidden">
        <img 
            className="w-full h-full object-cover" 
            src={restaurant.imageUrl} 
            alt={restaurant.name} 
            onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="uppercase tracking-wide text-xs font-bold text-blue-600 mb-1">推薦餐廳</div>
        <h3 className="text-xl font-bold text-stone-800 mb-2 leading-tight">{restaurant.name}</h3>
        {restaurant.rating && <div className="mb-3"><StarRating rating={restaurant.rating} /></div>}
        <p className="text-stone-600 text-sm flex-grow line-clamp-3 leading-relaxed">{restaurant.description}</p>
        {restaurant.mapUrl && (
          <a
            href={restaurant.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 self-start inline-flex items-center justify-center px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 transition-colors duration-200 w-full sm:w-auto"
          >
           <MapPinIcon />
            在地圖上查看
          </a>
        )}
      </div>
    </div>
  );
};