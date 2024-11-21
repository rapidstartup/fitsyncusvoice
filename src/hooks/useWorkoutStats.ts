import { useState, useCallback } from 'react';
import { logWorkout, getWorkoutHistory, getPersonalRecords, setPersonalRecord } from '../services/database';

export function useWorkoutStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveWorkout = useCallback(async (workoutData: {
    workoutName: string;
    durationSeconds: number;
    totalReps: number;
    movements: Array<{
      name: string;
      repsCompleted: number;
      timePerRep?: number;
    }>;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      await logWorkout(workoutData);
      
      // Check for potential PRs
      const existingRecords = await getPersonalRecords(workoutData.workoutName);
      const timeRecord = existingRecords.find(r => r.record_type === 'time');
      
      if (!timeRecord || workoutData.durationSeconds < timeRecord.value) {
        await setPersonalRecord({
          workoutName: workoutData.workoutName,
          recordType: 'time',
          value: workoutData.durationSeconds
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workout');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (limit?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      return await getWorkoutHistory(limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workout history');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPersonalRecords = useCallback(async (workoutName?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await getPersonalRecords(workoutName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personal records');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    saveWorkout,
    loadHistory,
    loadPersonalRecords
  };
}