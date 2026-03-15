export type GoalType = 'hard' | 'routine' | 'new';
export type GoalStatus = 'complete' | 'partial' | 'not_done' | null;
export type IdentityType = 'founder' | 'athlete' | 'builder' | 'creator' | 'other';
export type AiTone = 'supportive' | 'direct' | 'analytical';
export type FocusArea = 'health' | 'fitness' | 'career' | 'learning' | 'relationships' | 'creativity' | 'craft' | 'finance';
export type GoalDifficulty = 'light' | 'moderate' | 'ambitious';

export interface UserProfile {
  name: string;
  identityType: IdentityType;
  identityStatement: string;
  focusAreas: FocusArea[];
  aiTone: AiTone;
  onboardingComplete: boolean;
}

export interface DayEntry {
  date: string;
  hardGoal: string;
  routineGoal: string;
  newGoal: string;
  hardStatus: GoalStatus;
  routineStatus: GoalStatus;
  newStatus: GoalStatus;
  reflection?: string;
  hardNotes?: GoalNote[];
  routineNotes?: GoalNote[];
  newNotes?: GoalNote[];
  checkedIn: boolean;
}

export interface TomorrowEntry {
  date: string;
  hardGoal: string;
  routineGoal: string;
  newGoal: string;
  hardFriendName?: string;
  routineFriendName?: string;
  newFriendName?: string;
}

export interface GoalNote {
  text: string;
  time: string; // ISO string
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
