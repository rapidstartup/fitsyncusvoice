import React, { useState } from 'react';
import { X, Music, Activity, Heart, MessageSquare } from 'lucide-react';
import type { ConversationEntry } from '../services/voiceCoach';
import { useSpotify } from '../hooks/useSpotify';

interface SettingsModalProps {
  onClose: () => void;
  conversationHistory: ConversationEntry[];
}

export default function SettingsModal({ onClose, conversationHistory }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'services' | 'conversations'>('services');
  const { isConnected, connect, disconnect } = useSpotify();

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleSpotifyClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal rounded-3xl max-w-md w-full p-6 text-white max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button 
            onClick={onClose}
            className="glass-button p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('services')}
            className={`glass-button px-4 py-2 rounded-xl flex items-center gap-2 ${
              activeTab === 'services' ? 'bg-white/30' : ''
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Services</span>
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`glass-button px-4 py-2 rounded-xl flex items-center gap-2 ${
              activeTab === 'conversations' ? 'bg-white/30' : ''
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Voice Log</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'services' ? (
            <div className="space-y-3">
              <button 
                onClick={handleSpotifyClick}
                className="w-full glass-button p-4 rounded-xl text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Music className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Spotify</p>
                      <p className="text-sm opacity-80">
                        {isConnected ? 'Premium Account' : 'Click to connect'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                </div>
              </button>

              <div className="glass-button p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Strava</p>
                      <p className="text-sm opacity-80">Connected</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              </div>

              <div className="glass-button p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Apple Health</p>
                      <p className="text-sm opacity-80">Syncing data</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {conversationHistory.map((entry, index) => (
                <div
                  key={index}
                  className={`glass-button p-4 rounded-xl ${
                    entry.type === 'coach' ? 'ml-4' : 'mr-4'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">
                      {entry.type === 'coach' ? '🤖 Coach' : '👤 You'}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{entry.message}</p>
                </div>
              ))}
              {conversationHistory.length === 0 && (
                <p className="text-center opacity-70 py-8">
                  No conversation history yet. Try using the voice coach!
                </p>
              )}
            </div>
          )}
        </div>

        <button className="w-full mt-6 py-3 glass-button rounded-xl">
          Sign Out
        </button>
      </div>
    </div>
  );
}