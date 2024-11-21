import React from 'react';
import { Play, Pause, Volume2, Music } from 'lucide-react';
import { SpotifyTrack } from '../services/spotify';
import { useSpotify } from '../hooks/useSpotify';

interface MusicPlayerProps {
  track: SpotifyTrack | null;
  isPlaying: boolean;
  volume: number;
  onPlayPause: () => void;
  onVolumeChange: (volume: number) => void;
  error?: string | null;
}

export default function MusicPlayer({ 
  track, 
  isPlaying, 
  volume, 
  onPlayPause, 
  onVolumeChange,
  error
}: MusicPlayerProps) {
  const { isConnected } = useSpotify();

  if (!isConnected) {
    return (
      <div className="glass-card rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6" />
          <div className="flex-1">
            <p className="font-medium">Connect Spotify</p>
            <p className="text-sm opacity-80">
              Please connect your Spotify account in settings to enable music playback
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-6 text-white">
      <div className="flex items-center gap-3">
        <Music className="w-6 h-6" />
        <div className="flex-1">
          {track ? (
            <>
              <p className="font-medium">{track.name}</p>
              <p className="text-sm opacity-80">{track.artists.join(', ')}</p>
            </>
          ) : (
            <>
              <p className="font-medium">Workout Mix</p>
              <p className="text-sm opacity-80">Matched to workout intensity</p>
            </>
          )}
          {error && (
            <p className="text-xs text-red-300 mt-1">{error}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onPlayPause}
            className="glass-button p-2 rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 accent-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}