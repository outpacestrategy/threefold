import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DayEntry, TomorrowEntry } from '../types';

const KEYS = {
  USER_PROFILE: 'userProfile',
  TODAY_ENTRY: 'todayEntry',
  TOMORROW_ENTRY: 'tomorrowEntry',
  HISTORY: 'history',
  CHAT_MESSAGES: 'chatMessages',
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getTodayEntry(): Promise<DayEntry | null> {
  const raw = await AsyncStorage.getItem(KEYS.TODAY_ENTRY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveTodayEntry(entry: DayEntry): Promise<void> {
  await AsyncStorage.setItem(KEYS.TODAY_ENTRY, JSON.stringify(entry));
}

export async function getTomorrowEntry(): Promise<TomorrowEntry | null> {
  const raw = await AsyncStorage.getItem(KEYS.TOMORROW_ENTRY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveTomorrowEntry(entry: TomorrowEntry): Promise<void> {
  await AsyncStorage.setItem(KEYS.TOMORROW_ENTRY, JSON.stringify(entry));
}

export async function getHistory(): Promise<DayEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.HISTORY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToHistory(entry: DayEntry): Promise<void> {
  const history = await getHistory();
  // Avoid duplicates for the same date
  const filtered = history.filter((h) => h.date !== entry.date);
  filtered.unshift(entry);
  await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
}

export async function getChatMessages(): Promise<{ role: string; content: string }[]> {
  const raw = await AsyncStorage.getItem(KEYS.CHAT_MESSAGES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveChatMessages(messages: { role: string; content: string }[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CHAT_MESSAGES, JSON.stringify(messages));
}

// Promote tomorrow's plan to today when a new day starts
export async function promoteToToday(): Promise<void> {
  const tomorrow = await getTomorrowEntry();
  const today = new Date().toISOString().split('T')[0];

  if (tomorrow && tomorrow.date === today) {
    const todayEntry: DayEntry = {
      date: today,
      hardGoal: tomorrow.hardGoal,
      routineGoal: tomorrow.routineGoal,
      newGoal: tomorrow.newGoal,
      hardStatus: null,
      routineStatus: null,
      newStatus: null,
      checkedIn: false,
    };
    await saveTodayEntry(todayEntry);
    await AsyncStorage.removeItem(KEYS.TOMORROW_ENTRY);
  }
}

export function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
