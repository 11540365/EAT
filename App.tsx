import React, { useState, useEffect, useCallback } from 'react';
import { 
    getDinnerRecommendations, 
    getRandomRecommendations,
    getNearbyCuisineTypes,
} from './services/geminiService';
import { CUISINE_OPTIONS } from './constants';
import { RestaurantCard } from './components/RestaurantCard';
import { LoadingSpinner } from './components/LoadingSpinner';
import type { Location, Restaurant } from './types';
import { AppStatus } from './types';

const FAVORITES_STORAGE_KEY = 'dinnerAppFavorites';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>('');


  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (e) {
      console.error("Failed to parse favorites from localStorage", e);
    }
  }, []);
  
  useEffect(() => {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
        console.error("Failed to save favorites to localStorage", e);
    }
  }, [favorites]);

  useEffect(() => {
    setStatus(AppStatus.LoadingLocation);
    setLoadingMessage("正在取得您的位置...");
    setError(null);
    if (!navigator.geolocation) {
      setError("您的瀏覽器不支援地理位置功能。");
      setStatus(AppStatus.Error);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(userLocation);
        setStatus(AppStatus.Idle);
        
        setLoadingMessage("正在根據您的位置尋找料理類型...");
        try {
            const nearbyCuisines = await getNearbyCuisineTypes(userLocation);
            const finalCuisines = nearbyCuisines.length > 0 ? [...new Set(nearbyCuisines)] : CUISINE_OPTIONS;
            setCuisineOptions(finalCuisines);
            if (finalCuisines.length > 0) {
                setSelectedCuisine(finalCuisines[0]);
            }
        } catch (e) {
            console.error("Failed to fetch dynamic cuisine types, using fallback.", e);
            setCuisineOptions(CUISINE_OPTIONS);
            if (CUISINE_OPTIONS.length > 0) {
                setSelectedCuisine(CUISINE_OPTIONS[0]);
            }
        }
      },
      () => {
        setError("無法獲取您的位置。請允許位置權限以便推薦餐廳。");
        setStatus(AppStatus.Error);
        // Provide fallback cuisines even if location fails
        setCuisineOptions(CUISINE_OPTIONS);
        if (CUISINE_OPTIONS.length > 0) {
            setSelectedCuisine(CUISINE_OPTIONS[0]);
        }
      }
    );
  }, []);
  
  const handleToggleFavorite = (restaurant: Restaurant) => {
    setFavorites(prevFavorites => {
        const isFavorited = prevFavorites.some(fav => fav.id === restaurant.id);
        if (isFavorited) {
            return prevFavorites.filter(fav => fav.id !== restaurant.id);
        } else {
            return [...prevFavorites, restaurant];
        }
    });
  };

  const handleFindDinner = useCallback(async () => {
    if (!location || !selectedCuisine) return;
    setStatus(AppStatus.LoadingRestaurants);
    setLoadingMessage(`正在尋找美味的「${selectedCuisine}」...`);
    setError(null);
    setRestaurants([]);
    try {
      const results = await getDinnerRecommendations(location, selectedCuisine);
      setRestaurants(results);
      setStatus(AppStatus.Success);
    } catch (e: any) {
      setError(e.message || "發生未知錯誤。");
      setStatus(AppStatus.Error);
    }
  }, [location, selectedCuisine]);

  const handleSurpriseMe = useCallback(async () => {
    if (!location) return;
    setStatus(AppStatus.LoadingRestaurants);
    setLoadingMessage("正在為您尋找隨機推薦...");
    setError(null);
    setRestaurants([]);
    try {
      const results = await getRandomRecommendations(location);
      setRestaurants(results);
      setStatus(AppStatus.Success);
    } catch (e: any) {
      setError(e.message || "發生未知錯誤。");
      setStatus(AppStatus.Error);
    }
  }, [location]);

  const handleCuisineClick = (cuisine: string) => {
    setSelectedCuisine(cuisine);
  };
  
  const isActionDisabled = status === AppStatus.LoadingLocation || status === AppStatus.LoadingRestaurants || !location;
  const buttonBaseStyle = "w-full justify-center items-center text-lg font-bold text-white py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg flex gap-2";
  
  // Blue gradient buttons
  const findFoodButtonStyle = "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700";
  const surpriseButtonStyle = "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600";
  
  const cuisineButtonBase = "px-4 py-2 text-sm sm:text-base font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  const selectedCuisineButton = "bg-blue-600 text-white shadow-md transform scale-105";
  const unselectedCuisineButton = "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <main className="w-full max-w-5xl mx-auto">
        <header className="text-center my-8">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 drop-shadow-sm">晚餐吃什麼？</h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">不知道要吃什麼嗎？選擇一個料理類型，讓我來幫您推薦！</p>
        </header>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl mb-8 border border-slate-100">
          <div className="mb-6">
            <label className="text-lg font-bold text-slate-700 mb-3 block">1. 選擇料理類型</label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
               {cuisineOptions.map((cuisine) => (
                  <button
                    key={cuisine}
                    onClick={() => handleCuisineClick(cuisine)}
                    className={`${cuisineButtonBase} ${selectedCuisine === cuisine ? selectedCuisineButton : unselectedCuisineButton}`}
                  >
                    {cuisine}
                  </button>
                ))}
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={handleFindDinner} disabled={isActionDisabled || !selectedCuisine} className={`${buttonBaseStyle} ${findFoodButtonStyle}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              尋找美食！
            </button>
            <button onClick={handleSurpriseMe} disabled={isActionDisabled} className={`${buttonBaseStyle} ${surpriseButtonStyle}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              隨機推薦餐廳
            </button>
          </div>
        </div>

        <div className="mt-10">
          {(status === AppStatus.LoadingLocation || status === AppStatus.LoadingRestaurants) && (
              <LoadingSpinner message={loadingMessage} />
          )}

          {status === AppStatus.Error && error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
              <p className="font-bold">噢不！</p>
              <p>{error}</p>
            </div>
          )}

          {status === AppStatus.Success && restaurants.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {restaurants.map((resto) => (
                <RestaurantCard 
                    key={resto.id} 
                    restaurant={resto} 
                    isFavorite={favorites.some(fav => fav.id === resto.id)}
                    onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          {status === AppStatus.Success && restaurants.length === 0 && (
             <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <p className="text-stone-600 text-lg">找不到符合條件的餐廳，要不要換個料理類型試試？</p>
             </div>
          )}
        </div>

        {favorites.length > 0 && (
            <section className="mt-16 border-t-4 border-blue-100 pt-10">
                 <div className="flex items-center justify-center mb-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <h2 className="text-3xl font-bold text-slate-800">我的美食口袋名單</h2>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-blue-50 p-6 rounded-3xl">
                    {favorites.map((resto) => (
                         <RestaurantCard 
                            key={`fav-${resto.id}`} 
                            restaurant={resto} 
                            isFavorite={true}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    ))}
                 </div>
            </section>
        )}
      </main>
    </div>
  );
};

export default App;