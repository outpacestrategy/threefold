import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DayEntry, TomorrowEntry } from '../types';

const KEYS = {
  USER_PROFILE: 'userProfile',
  TODAY_ENTRY: 'todayEntry',
  TOMORROW_ENTRY: 'tomorrowEntry',
  HISTORY: 'history',
  CHAT_MESSAGES: 'chatMessages',
  TOKEN_BALANCE: 'tokenBalance',
  TOKEN_HISTORY: 'tokenHistory',
};

const DEFAULT_TOKENS = 87;

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

export async function getTokenBalance(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.TOKEN_BALANCE);
  return raw !== null ? parseInt(raw, 10) : DEFAULT_TOKENS;
}

export async function spendToken(): Promise<number> {
  const balance = await getTokenBalance();
  const updated = Math.max(0, balance - 1);
  await AsyncStorage.setItem(KEYS.TOKEN_BALANCE, String(updated));
  return updated;
}

export async function setTokenBalance(amount: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.TOKEN_BALANCE, String(amount));
}

export interface TokenHistoryEntry {
  label: string;
  date: string;
  amount: number;
}

export async function getTokenHistory(): Promise<TokenHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.TOKEN_HISTORY);
  return raw ? JSON.parse(raw) : [];
}

export async function addTokenHistoryEntry(label: string, amount: number): Promise<void> {
  const history = await getTokenHistory();
  history.unshift({ label, date: new Date().toISOString(), amount });
  await AsyncStorage.setItem(KEYS.TOKEN_HISTORY, JSON.stringify(history.slice(0, 100)));
}
