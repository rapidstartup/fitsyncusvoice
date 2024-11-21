import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Mic, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Workout from './pages/Workout';
import SettingsModal from './components/SettingsModal';
import { useVoiceCoach } from './hooks/useVoiceCoach';

export default function App() {
  const [showSettings, setShowSettings] = React.useState(false);
  const { isListening, isMicReady, isProcessingVoice, toggleListening, conversationHistory } = useVoiceCoach();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-400">
      <div className="max-w-md mx-auto px-4 pt-4 pb-20">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">LiftrAI CrossFit AI Coach</h1>
          <div className="flex gap-3">
            <div className="relative">
              <button 
                className={`glass-button p-2 rounded-full transition-all duration-300 ${
                  !isMicReady ? 'opacity-50 cursor-not-allowed' :
                  isListening ? 'bg-green-500/50 hover:bg-green-500/60' : 'line-through'
                }`}
                onClick={toggleListening}
                disabled={!isMicReady}
                title={!isMicReady ? 'Microphone access required' : 'Toggle voice coach'}
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
              {isProcessingVoice && isListening && (
                <div className="absolute inset-0 rounded-full">
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="glass-button p-2 rounded-full"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
          </Routes>
        </main>

        {showSettings && (
          <SettingsModal 
            onClose={() => setShowSettings(false)} 
            conversationHistory={conversationHistory}
          />
        )}
      </div>
    </div>
  );
}