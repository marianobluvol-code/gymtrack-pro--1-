
export interface SetData {
  id: string;
  weight: number;
  reps: number;
  rir?: number;
  rpe?: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: SetData[];
  notes?: string;
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  exercises: Exercise[];
  duration: number; // in seconds
}

export interface Routine {
  id: string;
  name: string;
  exercises: { name: string }[];
}

export interface BodyMetric {
  id: string;
  date: string;
  weight: number;
  // Deprecated fields kept optional for backward compatibility if needed, 
  // but UI will only use weight/date
  bodyFat?: number; 
  measurements?: { [key: string]: number };
}

export interface CardioSession {
  id: string;
  date: string;
  type: string;
  duration: number; // minutes
  distance?: number; // km
  notes?: string;
}

export type AppView = 'dashboard' | 'workout' | 'routines' | 'ai_generator' | 'progress' | 'cardio';
