import { useState, useEffect, useCallback } from 'react';
import { spotifyService, SpotifyTrack } from '../services/spotify';

export function useSpotify() {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('spotify_token');
    if (token) {
      spotifyService.setAccessToken(token);
      setIsConnected(true);
    }

    const unsubscribe = spotifyService.subscribeToPlayerState((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTrack(state.currentTrack);
      setIsInitialized(state.isReady);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const connect = useCallback(() => {
    window.location.href = spotifyService.getAuthUrl();
  }, []);

  const handleCallback = useCallback((hash: string) => {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      spotifyService.setAccessToken(token);
      setIsConnected(true);
    }
  }, []);

  const matchAndPlayTrack = useCallback(async (targetBpm: number, intensity: 'warmup' | 'hiit' | 'endurance' | 'cooldown') => {
    if (!isInitialized) {
      setError('Spotify player not initialized');
      return;
    }

    try {
      setError(null);
      const track = await spotifyService.findMatchingTrack(targetBpm, intensity);
      if (track) {
        await spotifyService.playTrack(track.uri);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to play track';
      setError(message);
      console.error('Error playing matching track:', err);
    }
  }, [isInitialized]);

  const togglePlayback = useCallback(async () => {
    if (!isInitialized) {
      setError('Spotify player not initialized');
      return;
    }

    try {
      setError(null);
      if (isPlaying) {
        await spotifyService.pause();
      } else {
        await spotifyService.resume();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle playback';
      setError(message);
      console.error('Error toggling playback:', err);
    }
  }, [isPlaying, isInitialized]);

  const updateVolume = useCallback(async (newVolume: number) => {
    if (!isInitialized) {
      setError('Spotify player not initialized');
      return;
    }

    try {
      setError(null);
      await spotifyService.setVolume(newVolume);
      setVolume(newVolume);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update volume';
      setError(message);
      console.error('Error updating volume:', err);
    }
  }, [isInitialized]);

  const skipToNext = useCallback(async () => {
    if (!isInitialized) {
      setError('Spotify player not initialized');
      return;
    }

    try {
      setError(null);
      await spotifyService.skipToNext();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to skip track';
      setError(message);
      console.error('Error skipping track:', err);
    }
  }, [isInitialized]);

  const disconnect = useCallback(() => {
    spotifyService.disconnect();
    setIsConnected(false);
    setCurrentTrack(null);
    setIsPlaying(false);
    setError(null);
    setIsInitialized(false);
  }, []);

  return {
    isConnected,
    isInitialized,
    currentTrack,
    isPlaying,
    volume,
    error,
    connect,
    handleCallback,
    matchAndPlayTrack,
    togglePlayback,
    updateVolume,
    disconnect,
    skipToNext
  };
}