/**
 * Function to get an address from coordinates using the Google Maps Geocoding API
 * @param lat Latitude
 * @param lng Longitude 
 * @returns Promise that resolves to an address string
 */
export const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
  try {
    // Check if we're in a browser environment with fetch
    if (typeof window === 'undefined') {
      return 'Address lookup not available';
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return 'Address lookup not available';
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Return the formatted address from the first result
      return data.results[0].formatted_address;
    } else {
      console.error('Geocoding API error:', data.status);
      return 'Address not found';
    }
  } catch (error) {
    console.error('Error getting address:', error);
    return 'Error looking up address';
  }
};

/**
 * Function to get a simplified address from coordinates (cached version)
 * This uses a cache to avoid making too many API requests
 */
const addressCache: Record<string, {address: string, timestamp: number}> = {};
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const getCachedAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
  // Round coordinates to 5 decimal places for caching
  const roundedLat = Math.round(lat * 100000) / 100000;
  const roundedLng = Math.round(lng * 100000) / 100000;
  
  const cacheKey = `${roundedLat},${roundedLng}`;
  
  // Check if we have a cached address that hasn't expired
  const now = Date.now();
  if (addressCache[cacheKey] && (now - addressCache[cacheKey].timestamp) < CACHE_EXPIRY) {
    return addressCache[cacheKey].address;
  }
  
  // If not cached or expired, get a new address
  const address = await getAddressFromCoordinates(roundedLat, roundedLng);
  
  // Cache the result
  addressCache[cacheKey] = {
    address,
    timestamp: now
  };
  
  return address;
};

/**
 * Function to get an approximate address from coordinates without making an API call
 * This is useful when you need a quick location and don't want to wait for the API
 */
export const getApproximateLocation = (lat: number, lng: number): string => {
  return `${lat.toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
}; 