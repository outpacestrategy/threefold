import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DayEntry, TomorrowEntry } from '../types';
import { supabase } from './supabase';

const KEYS = {
  USER_PROFILE: 'userProfile',
  TODAY_ENTRY: 'todayEntry',
  TOMORROW_ENTRY: 'tomorrowEntry',
  HISTORY: 'history',
  CHAT_MESSAGES: 'chatMessages',
  TOKEN_BALANCE: 'tokenBalance',
  TOKEN_HISTORY: 'tokenHistory',
};

const DEFAULT_TOKENS = 5;

// ─── Profile ───

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  // Sync to Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('tf_profiles').upsert({
        id: user.id,
        name: profile.name,
        identity_type: profile.identityType,
        identity_statement: profile.identityStatement,
        focus_areas: profile.focusAreas,
        ai_tone: profile.aiTone,
        onboarding_complete: profile.onboardingComplete,
      });
    }
  } catch {}
}

// ─── Today Entry ───

export async function getTodayEntry(): Promise<DayEntry | null> {
  const raw = await AsyncStorage.getItem(KEYS.TODAY_ENTRY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveTodayEntry(entry: DayEntry): Promise<void> {
  await AsyncStorage.setItem(KEYS.TODAY_ENTRY, JSON.stringify(entry));
  // Sync to Supabase
  upsertDayEntry(entry);
}

// ─── Tomorrow Entry ───

export async function getTomorrowEntry(): Promise<TomorrowEntry | null> {
  const raw = await AsyncStorage.getItem(KEYS.TOMORROW_ENTRY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveTomorrowEntry(entry: TomorrowEntry): Promise<void> {
  await AsyncStorage.setItem(KEYS.TOMORROW_ENTRY, JSON.stringify(entry));
  // Sync tomorrow entry as a day entry to Supabase
  upsertDayEntry({
    date: entry.date,
    hardGoal: entry.hardGoal,
    routineGoal: entry.routineGoal,
    newGoal: entry.newGoal,
    hardStatus: null,
    routineStatus: null,
    newStatus: null,
    checkedIn: false,
  });
}

// ─── History ───

export async function getHistory(): Promise<DayEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.HISTORY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToHistory(entry: DayEntry): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((h) => h.date !== entry.date);
  filtered.unshift(entry);
  await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
  // Sync to Supabase
  upsertDayEntry(entry);
}

// ─── Day promotion ───

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

// ─── Chat ───

export async function getChatMessages(): Promise<{ role: string; content: string }[]> {
  const raw = await AsyncStorage.getItem(KEYS.CHAT_MESSAGES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveChatMessages(messages: { role: string; content: string }[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CHAT_MESSAGES, JSON.stringify(messages));
}

// ─── Tokens ───

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

// ─── Streaks ───

export interface StreakInfo {
  total: number;
  hard: number;
  routine: number;
  new: number;
}

export function computeStreaks(history: DayEntry[]): StreakInfo {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let total = 0, hard = 0, routine = 0, newStreak = 0;
  let cT = true, cH = true, cR = true, cN = true;
  for (const e of sorted) {
    if (!(e.hardGoal || e.routineGoal || e.newGoal)) continue;
    if (cT) { if (e.hardStatus === 'complete' && e.routineStatus === 'complete' && e.newStatus === 'complete') total++; else cT = false; }
    if (cH) { if (e.hardStatus === 'complete') hard++; else cH = false; }
    if (cR) { if (e.routineStatus === 'complete') routine++; else cR = false; }
    if (cN) { if (e.newStatus === 'complete') newStreak++; else cN = false; }
    if (!cT && !cH && !cR && !cN) break;
  }
  return { total, hard, routine, new: newStreak };
}

// ─── Supabase Sync Helpers ───

async function upsertDayEntry(entry: DayEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('tf_day_entries').upsert({
      user_id: user.id,
      date: entry.date,
      hard_goal: entry.hardGoal,
      routine_goal: entry.routineGoal,
      new_goal: entry.newGoal,
      hard_complete: entry.hardStatus === 'complete',
      routine_complete: entry.routineStatus === 'complete',
      new_complete: entry.newStatus === 'complete',
      reflection: entry.reflection || null,
      checked_in: entry.checkedIn,
    }, { onConflict: 'user_id,date' });
  } catch {}
}

export async function syncFromSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sync profile
    const { data: profile } = await supabase
      .from('tf_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      const localProfile: UserProfile = {
        name: profile.name,
        identityType: profile.identity_type,
        identityStatement: profile.identity_statement,
        focusAreas: profile.focus_areas,
        aiTone: profile.ai_tone,
        onboardingComplete: profile.onboarding_complete,
      };
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(localProfile));
    }

    // Sync day entries to history
    const { data: entries } = await supabase
      .from('tf_day_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(90);

    if (entries && entries.length > 0) {
      const history: DayEntry[] = entries.map((e: any) => ({
        date: e.date,
        hardGoal: e.hard_goal,
        routineGoal: e.routine_goal,
        newGoal: e.new_goal,
        hardStatus: e.hard_complete ? 'complete' as const : (e.checked_in ? 'not_done' as const : null),
        routineStatus: e.routine_complete ? 'complete' as const : (e.checked_in ? 'not_done' as const : null),
        newStatus: e.new_complete ? 'complete' as const : (e.checked_in ? 'not_done' as const : null),
        reflection: e.reflection || undefined,
        checkedIn: e.checked_in,
      }));
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));

      // Set today's entry if it exists
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = history.find((h) => h.date === today);
      if (todayEntry) {
        await AsyncStorage.setItem(KEYS.TODAY_ENTRY, JSON.stringify(todayEntry));
      }
    }
  } catch {}
}
