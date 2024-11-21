import { config } from '../config/env';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: typeof Spotify;
  }
}

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_API_ENDPOINT = 'https://api.spotify.com/v1';
const WORKOUT_PLAYLISTS = {
  warmup: 'spotify:playlist:37i9dQZF1DX70RN3TfWWJh', // Workout Warmup
  hiit: 'spotify:playlist:37i9dQZF1DX76Wlfdnj7AP',   // Beast Mode
  endurance: 'spotify:playlist:37i9dQZF1DX32NsLKyzScr', // Power Workout
  cooldown: 'spotify:playlist:37i9dQZF1DX0hWmn8d5pRH'  // Cool Down
};

export interface SpotifyTrack {
  id: string | null;
  name: string;
  artists: string[];
  duration_ms: number;
  tempo?: number;
  uri: string;
}

type PlayerState = {
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
};

type PlayerStateCallback = (state: PlayerState) => void;

interface SpotifyPlaylistTrackItem {
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    duration_ms: number;
    uri: string;
  };
}

class SpotifyService {
  private accessToken: string | null = null;
  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private stateCallbacks: Set<PlayerStateCallback> = new Set();
  private playerState: PlayerState = {
    isReady: false,
    isPlaying: false,
    currentTrack: null
  };

  constructor() {
    this.initializePlayer();
  }

  private async initializePlayer() {
    if (!window.Spotify) {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);

      window.onSpotifyWebPlaybackSDKReady = () => {
        this.createPlayer();
      };
    } else {
      this.createPlayer();
    }
  }

  private createPlayer() {
    if (!this.accessToken) return;

    this.player = new window.Spotify.Player({
      name: 'CrossFit AI Coach',
      getOAuthToken: cb => cb(this.accessToken!),
      volume: 0.5
    });

    this.player.addListener('ready', ({ device_id }) => {
      this.deviceId = device_id;
      this.playerState.isReady = true;
      this.notifyStateChange();
    });

    this.player.addListener('player_state_changed', state => {
      if (state) {
        this.playerState.isPlaying = !state.paused;
        this.playerState.currentTrack = state.track_window.current_track 
          ? {
              id: state.track_window.current_track.id,
              name: state.track_window.current_track.name,
              artists: state.track_window.current_track.artists.map(a => a.name),
              duration_ms: state.track_window.current_track.duration_ms,
              uri: state.track_window.current_track.uri
            }
          : null;
        this.notifyStateChange();
      }
    });

    this.player.connect();
  }

  private notifyStateChange() {
    this.stateCallbacks.forEach(callback => callback(this.playerState));
  }

  subscribeToPlayerState(callback: PlayerStateCallback) {
    this.stateCallbacks.add(callback);
    callback(this.playerState);
    return () => this.stateCallbacks.delete(callback);
  }

  getAuthUrl() {
    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-modify-playback-state',
      'user-read-playback-state'
    ];

    const params = new URLSearchParams({
      client_id: config.spotify.clientId,
      response_type: 'token',
      redirect_uri: config.spotify.redirectUri,
      scope: scopes.join(' '),
    });

    return `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('spotify_token', token);
    this.createPlayer();
  }

  async getTrackTempo(trackId: string): Promise<number> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${SPOTIFY_API_ENDPOINT}/audio-features/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch track tempo');
    }

    const data = await response.json();
    return data.tempo;
  }

  async getPlaylistTracks(intensity: 'warmup' | 'hiit' | 'endurance' | 'cooldown'): Promise<SpotifyTrack[]> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const playlistId = WORKOUT_PLAYLISTS[intensity].split(':')[2];
    const response = await fetch(`${SPOTIFY_API_ENDPOINT}/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch playlist tracks');
    }

    const data = await response.json();
    const tracks = await Promise.all(
      data.items.map(async (item: SpotifyPlaylistTrackItem) => {
        const tempo = await this.getTrackTempo(item.track.id);
        return {
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists.map((a: { name: string }) => a.name),
          duration_ms: item.track.duration_ms,
          tempo,
          uri: item.track.uri
        };
      })
    );

    return tracks;
  }

  async playTrack(trackUri: string) {
    if (!this.accessToken || !this.deviceId) {
      throw new Error('Player not ready');
    }

    if (!this.playerState.isReady) {
      throw new Error('Player not initialized');
    }

    const response = await fetch(`${SPOTIFY_API_ENDPOINT}/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to play track');
    }

    this.playerState.isPlaying = true;
    this.notifyStateChange();
  }

  async findMatchingTrack(targetBpm: number, intensity: 'warmup' | 'hiit' | 'endurance' | 'cooldown'): Promise<SpotifyTrack | null> {
    const tracks = await this.getPlaylistTracks(intensity);
    return tracks.reduce((closest, track) => {
      if (!track.tempo) return closest;
      if (!closest) return track;
      
      const currentDiff = Math.abs(track.tempo - targetBpm);
      const closestDiff = Math.abs(closest.tempo! - targetBpm);
      
      return currentDiff < closestDiff ? track : closest;
    }, null as SpotifyTrack | null);
  }

  async pause() {
    if (!this.player || !this.playerState.isReady) {
      throw new Error('Player not ready');
    }

    await this.player.pause();
    this.playerState.isPlaying = false;
    this.notifyStateChange();
  }

  async resume() {
    if (!this.player || !this.playerState.isReady) {
      throw new Error('Player not ready');
    }

    await this.player.resume();
    this.playerState.isPlaying = true;
    this.notifyStateChange();
  }

  async setVolume(volume: number) {
    if (!this.player || !this.playerState.isReady) {
      throw new Error('Player not ready');
    }

    await this.player.setVolume(volume);
  }

  async skipToNext() {
    if (!this.player || !this.playerState.isReady) {
      throw new Error('Player not ready');
    }

    await this.player.nextTrack();
  }

  disconnect() {
    if (this.player) {
      this.player.disconnect();
    }
    this.accessToken = null;
    this.playerState = {
      isReady: false,
      isPlaying: false,
      currentTrack: null
    };
    this.notifyStateChange();
    localStorage.removeItem('spotify_token');
  }

  getPlayerState() {
    return this.playerState;
  }
}

export const spotifyService = new SpotifyService();