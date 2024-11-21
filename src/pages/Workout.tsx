import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, SkipForward, Activity } from 'lucide-react';
import StatsModal from '../components/StatsModal';
import MusicPlayer from '../components/MusicPlayer';
import { useWorkoutStats } from '../hooks/useWorkoutStats';
import { useVoiceCoach } from '../hooks/useVoiceCoach';
import { useSpotify } from '../hooks/useSpotify';
import { WORKOUTS } from '../constants/workouts';

const VOLUME_STEP = 0.1;

// Movement intensity mapping for music BPM
const MOVEMENT_BPM = {
  '1 Mile Run': { bpm: 160, intensity: 'endurance' },
  'Pull-ups': { bpm: 140, intensity: 'hiit' },
  'Push-ups': { bpm: 130, intensity: 'hiit' },
  'Squats': { bpm: 120, intensity: 'hiit' },
  'Thrusters': { bpm: 150, intensity: 'hiit' },
  'Clean & Jerks': { bpm: 145, intensity: 'hiit' }
} as const;

export default function Workout() {
  const navigate = useNavigate();
  const location = useLocation();
  const workoutName = (location.state?.workout || 'Murph') as keyof typeof WORKOUTS;
  const workout = WORKOUTS[workoutName];
  const { saveWorkout } = useWorkoutStats();
  const { voiceCoach } = useVoiceCoach();
  const { 
    isConnected,
    isInitialized,
    currentTrack,
    isPlaying,
    volume,
    error: spotifyError,
    connect,
    matchAndPlayTrack,
    togglePlayback,
    updateVolume,
    skipToNext
  } = useSpotify();

  const [showStats, setShowStats] = useState(false);
  const [currentMovementIndex, setCurrentMovementIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentStats, setCurrentStats] = useState({
    timeElapsed: '00:00',
    currentRound: 1,
    totalReps: 0,
    pace: 'Good pace!',
  });

  const [movementLogs, setMovementLogs] = useState<Array<{
    name: string;
    repsCompleted: number;
    timePerRep?: number;
    notes?: string;
  }>>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setCurrentStats(prev => ({
        ...prev,
        timeElapsed: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const handleNextMovement = () => {
    const currentMovement = workout.movements[currentMovementIndex];
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    const movementLog = {
      name: currentMovement.name,
      repsCompleted: currentMovement.reps,
      timePerRep: currentMovement.type === 'reps' ? timeSpent / currentMovement.reps : undefined
    };

    setMovementLogs(prev => [...prev, movementLog]);
    
    if (voiceCoach) {
      voiceCoach.updateWorkoutState(movementLog);
    }

    if (currentMovementIndex < workout.movements.length - 1) {
      setCurrentMovementIndex(prev => prev + 1);
      setCurrentStats(prev => ({
        ...prev,
        totalReps: prev.totalReps + currentMovement.reps
      }));

      // Update music to match next movement
      if (isConnected && isInitialized) {
        const nextMovement = workout.movements[currentMovementIndex + 1];
        const { bpm, intensity } = MOVEMENT_BPM[nextMovement.name as keyof typeof MOVEMENT_BPM];
        matchAndPlayTrack(bpm, intensity);
      }
    }
  };

  const handleEndWorkout = async () => {
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const totalReps = workout.movements.reduce((sum, movement) => sum + movement.reps, 0);

    await saveWorkout({
      workoutName: workout.name,
      durationSeconds: totalTime,
      totalReps,
      movements: movementLogs
    });

    navigate('/');
  };

  useEffect(() => {
    if (voiceCoach) {
      const currentMovement = workout.movements[currentMovementIndex];
      voiceCoach.updateWorkoutState({
        name: currentMovement.name,
        repsCompleted: currentMovement.reps,
        timePerRep: movementLogs[currentMovementIndex]?.timePerRep
      });

      voiceCoach.setActionHandler((action) => {
        switch (action) {
          case 'NEXT_MOVEMENT':
            handleNextMovement();
            break;
          case 'SHOW_STATS':
            setShowStats(true);
            break;
          case 'END_WORKOUT':
            handleEndWorkout();
            break;
          case 'MUSIC_PLAY':
            if (!isPlaying) togglePlayback();
            break;
          case 'MUSIC_PAUSE':
            if (isPlaying) togglePlayback();
            break;
          case 'MUSIC_VOLUME_UP':
            updateVolume(Math.min(1, volume + VOLUME_STEP));
            break;
          case 'MUSIC_VOLUME_DOWN':
            updateVolume(Math.max(0, volume - VOLUME_STEP));
            break;
          case 'MUSIC_NEXT':
            skipToNext();
            break;
        }
      });
    }
  }, [
    voiceCoach,
    currentMovementIndex,
    movementLogs,
    isPlaying,
    volume,
    togglePlayback,
    updateVolume,
    skipToNext,
    handleNextMovement,
    handleEndWorkout,
    isConnected,
    isInitialized,
    matchAndPlayTrack,
    workout
  ]);

  const currentMovement = workout.movements[currentMovementIndex];

  return (
    <div className="space-y-4">
      <MusicPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        onPlayPause={togglePlayback}
        onVolumeChange={updateVolume}
        error={spotifyError}
      />

      {/* Current Movement */}
      <div className="glass-card rounded-3xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">{currentMovement.name}</h2>
        <p className="opacity-80">
          {currentMovement.type === 'reps' 
            ? `${currentMovement.reps} reps remaining`
            : `${currentMovement.reps} mile`}
        </p>
      </div>

      {/* AI Coach */}
      <div className="glass-card rounded-3xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-4">AI Coach</h2>
        <p className="mb-6">Great form! Keep this pace for the next round of {currentMovement.name.toLowerCase()}.</p>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setShowStats(true)}
            className="glass-button p-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Activity className="w-5 h-5" />
            <span>Show Stats</span>
          </button>
          <button 
            onClick={handleNextMovement}
            className="glass-button p-3 rounded-xl flex items-center justify-center gap-2"
            disabled={currentMovementIndex === workout.movements.length - 1}
          >
            <SkipForward className="w-5 h-5" />
            <span>Next Movement</span>
          </button>
        </div>
      </div>

      {/* Voice Commands */}
      <div className="glass-card rounded-3xl p-4 text-white">
        <p className="text-sm opacity-80 text-center">
          Voice commands available - try saying "next movement" or "show stats"
        </p>
      </div>

      {/* End Workout Button */}
      <button 
        onClick={handleEndWorkout}
        className="w-full glass-button text-white py-4 rounded-2xl font-semibold"
      >
        End Workout
      </button>

      {/* Stats Modal */}
      {showStats && (
        <StatsModal
          onClose={() => setShowStats(false)}
          currentStats={currentStats}
        />
      )}
    </div>
  );
}