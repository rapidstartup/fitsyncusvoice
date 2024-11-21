import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Music, Trophy } from 'lucide-react';
import { useVoiceCoach } from '../hooks/useVoiceCoach';
import { WORKOUTS } from '../constants/workouts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { voiceCoach } = useVoiceCoach();

  const startWorkout = React.useCallback((workoutName: keyof typeof WORKOUTS = 'Murph') => {
    navigate('/workout', { state: { workout: workoutName } });
  }, [navigate]);

  React.useEffect(() => {
    if (voiceCoach) {
      voiceCoach.setActionHandler((action) => {
        if (action === 'START_WORKOUT') {
          startWorkout();
        }
      });
    }
  }, [voiceCoach, startWorkout]);

  return (
    <div className="space-y-4">
      {/* Weekly Stats */}
      <div className="glass-card rounded-3xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-4">This Week</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-bold">12</p>
            <p className="text-sm opacity-80">WODs Completed</p>
          </div>
          <div>
            <p className="text-3xl font-bold">3</p>
            <p className="text-sm opacity-80">PRs Achieved</p>
          </div>
        </div>
      </div>

      {/* Suggested Workout */}
      <div className="glass-card rounded-3xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Suggested WOD</h2>
        </div>
        <p className="text-lg font-medium">Hero WOD: "Murph"</p>
        <p className="opacity-80 text-sm mt-1">
          Based on your recent performance, we recommend tackling this benchmark workout.
        </p>
      </div>

      {/* Hero WODs List */}
      <div className="glass-card rounded-3xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-4">Hero WODs</h2>
        <div className="space-y-3">
          {Object.entries(WORKOUTS).map(([key, wod]) => (
            <div 
              key={key}
              className="glass-button p-4 rounded-2xl cursor-pointer"
              onClick={() => startWorkout(key as keyof typeof WORKOUTS)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{wod.name}</h3>
                <span className="text-sm glass-button px-3 py-1 rounded-full">
                  {wod.type}
                </span>
              </div>
              <p className="text-sm opacity-80">{wod.description}</p>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={() => startWorkout()}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-button text-white px-8 py-3 rounded-full font-semibold"
      >
        Start Workout
      </button>
    </div>
  );
}