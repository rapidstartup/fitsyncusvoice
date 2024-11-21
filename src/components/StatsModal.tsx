import React from 'react';
import { X, Activity, Timer, Zap } from 'lucide-react';

interface StatsModalProps {
  onClose: () => void;
  currentStats: {
    timeElapsed: string;
    currentRound: number;
    totalReps: number;
    pace: string;
  };
}

export default function StatsModal({ onClose, currentStats }: StatsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal rounded-3xl max-w-md w-full p-6 text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Workout Stats</h2>
          <button 
            onClick={onClose}
            className="glass-button p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="glass-button p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5" />
              <div>
                <p className="text-sm opacity-80">Time Elapsed</p>
                <p className="font-medium">{currentStats.timeElapsed}</p>
              </div>
            </div>
          </div>

          <div className="glass-button p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" />
              <div>
                <p className="text-sm opacity-80">Current Round</p>
                <p className="font-medium">{currentStats.currentRound}</p>
              </div>
            </div>
          </div>

          <div className="glass-button p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5" />
              <div>
                <p className="text-sm opacity-80">Total Reps</p>
                <p className="font-medium">{currentStats.totalReps}</p>
              </div>
            </div>
          </div>

          <div className="glass-button p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" />
              <div>
                <p className="text-sm opacity-80">Current Pace</p>
                <p className="font-medium">{currentStats.pace}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}