export interface Location {
  latitude: number;
  longitude: number;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  rating: string | null;
  mapUrl?: string;
  imageUrl: string;
}

export enum AppStatus {
  Idle,
  LoadingLocation,
  LoadingRestaurants,
  Success,
  Error,
}