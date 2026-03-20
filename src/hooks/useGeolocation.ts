import { useState, useCallback } from "react";

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPosition = useCallback((): Promise<GeoPosition> => {
    setLoading(true);
    setError(null);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = "Geolocation not supported";
        setError(err);
        setLoading(false);
        reject(new Error(err));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          const msg = err.code === 1 ? "Location permission denied" : "Could not get location";
          setError(msg);
          setLoading(false);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }, []);

  return { getPosition, loading, error };
}

export function isLocationValid(
  userLat: number, userLng: number,
  expectedLat: number, expectedLng: number,
  radiusMeters: number
): boolean {
  const R = 6371000;
  const dLat = ((expectedLat - userLat) * Math.PI) / 180;
  const dLng = ((expectedLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((userLat * Math.PI) / 180) *
    Math.cos((expectedLat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= radiusMeters;
}
