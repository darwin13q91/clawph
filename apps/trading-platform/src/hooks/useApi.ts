import { useState, useEffect } from 'react';

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async <T, >(
    endpoint: string,
    options?: RequestInit
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('API request failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const get = <T, >(endpoint: string) => request<T>(endpoint, { method: 'GET' });
  const post = <T, >(endpoint: string, body: object) => 
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  const del = <T, >(endpoint: string) => request<T>(endpoint, { method: 'DELETE' });

  return { request, get, post, del, isLoading, error };
}