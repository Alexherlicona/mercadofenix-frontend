// lib/useFavorites.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('access_token') || '';
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    const token = getToken();
    if (!token) {
      console.warn('No hay token de autenticación disponible');
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/api/favoritos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.warn('Token inválido o expirado (401)');
          localStorage.removeItem('access_token'); // Limpia token malo
          setFavorites([]);
          return;
        }
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      const ids = data.favoritos?.map((p: any) => p.id) || [];
      setFavorites(ids);
    } catch (err: any) {
      console.error('Error cargando favoritos:', err);
      setError(err.message || 'Error al cargar favoritos');
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(async (productId: string) => {
    const token = getToken();
    if (!token) {
      alert('Debes iniciar sesión para usar favoritos');
      return;
    }

    const isCurrentlyFavorite = favorites.includes(productId);
    const method = isCurrentlyFavorite ? 'DELETE' : 'POST';
    const endpoint = isCurrentlyFavorite ? 'remove' : 'add';

    // Actualización optimista
    setFavorites(prev =>
      isCurrentlyFavorite
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );

    try {
      const res = await fetch(`${API_URL}/api/favoritos/${endpoint}/${productId}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert('Sesión expirada. Por favor inicia sesión nuevamente.');
          localStorage.removeItem('access_token');
          loadFavorites();
          return;
        }
        throw new Error(`Error ${res.status}`);
      }

      // Si todo bien, el estado optimista ya está actualizado
    } catch (err) {
      console.error('Error al cambiar favorito:', err);
      // Revertir en caso de fallo
      loadFavorites();
    }
  }, [favorites, loadFavorites]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    isFavorite: (id: string) => favorites.includes(id),
    toggleFavorite,
    loading,
    error,
    refresh: loadFavorites,
  };
}