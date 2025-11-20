import { GoogleGenAI } from "@google/genai";
import type { Location, Restaurant } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// High quality food/restaurant images for fallback
const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80", // Restaurant interior
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80", // Plating
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80", // Outdoor seating
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80", // Fancy dish
    "https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?w=800&q=80",  // Cozy atmosphere
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80", // Food spread
    "https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80", // Italian
];

function getRandomFallbackImage() {
    return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
}

function parseRestaurantResponse(markdown: string, groundingChunks: any[]): Restaurant[] {
    const restaurants: Restaurant[] = [];
    const lines = markdown.split('\n').filter(line => line.trim().startsWith('*'));

    lines.forEach((line) => {
        // Updated regex to be more flexible with the colon placement
        const nameMatch = line.match(/\*\s*\*\*(.*?)\*\*:/);
        const name = nameMatch ? nameMatch[1].trim() : `推薦餐廳`;

        let description = line.replace(/\*\s*\*\*(.*?)\*\*:/, '').trim();
        
        // 1. Extract Image URL first
        const imageUrlMatch = description.match(/\[(https?:\/\/[^\]]+)\]/);
        let imageUrl = imageUrlMatch ? imageUrlMatch[1] : getRandomFallbackImage();

        // If the model returns a source.unsplash.com link (hallucination or old pattern), replace it as it's deprecated/unreliable
        if (imageUrl.includes('source.unsplash.com')) {
            imageUrl = getRandomFallbackImage();
        }

        if (imageUrlMatch) {
            description = description.replace(/\[(https?:\/\/[^\]]+)\]/, '').trim();
        }

        // 2. Extract star rating
        const ratingMatch = description.match(/\[(.*?)\]/);
        const rating = ratingMatch ? ratingMatch[1] : null;
        if (rating) {
            description = description.replace(/\[(.*?)\]/, '').trim();
        }
        
        const mapChunk = groundingChunks.find(chunk => chunk.maps && (line.includes(chunk.maps.title) || name.includes(chunk.maps.title)));
        const mapUrl = mapChunk ? mapChunk.maps.uri : undefined;

        const id = btoa(unescape(encodeURIComponent(name + description))).slice(0, 20);

        restaurants.push({
            id,
            name,
            description,
            rating,
            mapUrl,
            imageUrl,
        });
    });

    return restaurants;
}

const generateRecommendations = async (location: Location, prompt: string): Promise<Restaurant[]> => {
     try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                // Enable both Maps and Search to improve chances of finding real images and info
                tools: [{ googleMaps: {} }, { googleSearch: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: location.latitude,
                            longitude: location.longitude,
                        }
                    }
                }
            },
        });
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const responseText = response.text;
        
        if (!responseText) {
            throw new Error("API did not return any text.");
        }

        return parseRestaurantResponse(responseText, groundingChunks);

    } catch (error) {
        console.error("Error fetching recommendations from Gemini API:", error);
        throw new Error("無法獲取餐廳推薦，請稍後再試。");
    }
}


export const getDinnerRecommendations = async (location: Location, cuisine: string): Promise<Restaurant[]> => {
    const prompt = `
    請在我目前的位置附近，推薦 3 間${cuisine === '隨便！' ? '' : `類型為「${cuisine}」的`}晚餐餐廳。
    
    重點：請利用 Google Search 尋找該餐廳的真實照片 URL。如果找得到官網或知名評論網的圖片連結，請務必使用。如果真的找不到，請留空，我會使用預設圖片。
    
    請遵循以下格式，為每間餐廳提供一個 Markdown 列表項：
    * **餐廳名稱:** [星級評分，例如：4.5顆星] - 1-2句話的簡短描述，說明它的特色或推薦菜色。[請在此處插入餐廳真實圖片URL，如果找不到請留空]
    `;
    return generateRecommendations(location, prompt);
};

export const getRandomRecommendations = async (location: Location): Promise<Restaurant[]> => {
    const prompt = `
    請在我目前的位置附近，隨機推薦 3 間不同料理類型且評價良好的晚餐餐廳。
    
    重點：請利用 Google Search 尋找該餐廳的真實照片 URL。如果找得到官網或知名評論網的圖片連結，請務必使用。如果真的找不到，請留空，我會使用預設圖片。
    
    請遵循以下格式，為每間餐廳提供一個 Markdown 列表項：
    * **餐廳名稱:** [星級評分，例如：4.5顆星] - 1-2句話的簡短描述，說明它的特色或推薦菜色。[請在此處插入餐廳真實圖片URL，如果找不到請留空]
    `;
    return generateRecommendations(location, prompt);
};

export const getNearbyCuisineTypes = async (location: Location): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `根據經緯度 ${location.latitude}, ${location.longitude}，推薦8到10種附近熱門且適合晚餐的料理類型。請只用繁體中文回答，並以逗號分隔，例如：「日式料理, 義式料理, 火鍋」。不要包含任何其他文字或編號。`,
        });

        const text = response.text.trim();
        if (!text) return [];

        return text.split(',').map(cuisine => cuisine.trim()).filter(Boolean);
    } catch (error) {
        console.error("Error fetching cuisine types:", error);
        return []; // Return empty array on error, so fallback can be used
    }
};