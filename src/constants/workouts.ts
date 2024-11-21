// Define workout types
export type MovementType = 'distance' | 'reps';

export interface Movement {
  name: string;
  reps: number;
  type: MovementType;
}

export interface Workout {
  name: string;
  description: string;
  type: string;
  movements: Movement[];
}

export const WORKOUTS: Record<string, Workout> = {
  Murph: {
    name: "Murph",
    description: "1 mile Run, 100 Pull-ups, 200 Push-ups, 300 Squats, 1 mile Run",
    type: "For Time",
    movements: [
      { name: '1 Mile Run', reps: 1, type: 'distance' },
      { name: 'Pull-ups', reps: 100, type: 'reps' },
      { name: 'Push-ups', reps: 200, type: 'reps' },
      { name: 'Squats', reps: 300, type: 'reps' },
      { name: '1 Mile Run', reps: 1, type: 'distance' },
    ]
  },
  Fran: {
    name: "Fran",
    description: "21-15-9 Thrusters (95/65 lb) & Pull-ups",
    type: "For Time",
    movements: [
      { name: 'Thrusters', reps: 21, type: 'reps' },
      { name: 'Pull-ups', reps: 21, type: 'reps' },
      { name: 'Thrusters', reps: 15, type: 'reps' },
      { name: 'Pull-ups', reps: 15, type: 'reps' },
      { name: 'Thrusters', reps: 9, type: 'reps' },
      { name: 'Pull-ups', reps: 9, type: 'reps' },
    ]
  },
  Grace: {
    name: "Grace",
    description: "30 Clean & Jerks (135/95 lb)",
    type: "For Time",
    movements: [
      { name: 'Clean & Jerks', reps: 30, type: 'reps' },
    ]
  }
} as const;