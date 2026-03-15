import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserProfile,
  saveUserProfile,
  getTokenBalance,
  getTokenHistory,
  TokenHistoryEntry,
} from '../lib/storage';
import { UserProfile, FocusArea, AiTone, GoalDifficulty } from '../types';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications, scheduleEveningReminder } from '../lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FOCUS_OPTIONS: { value: FocusArea; label: string }[] = [
  { value: 'health', label: 'Health' },
  { value: 'career', label: 'Career' },
  { value: 'learning', label: 'Learning' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'craft', label: 'Craft' },
  { value: 'finance', label: 'Finance' },
];

const DIFFICULTY_OPTIONS: { value: GoalDifficulty; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'ambitious', label: 'Ambitious' },
];

const COACH_OPTIONS: { value: AiTone; label: string }[] = [
  { value: 'supportive', label: 'Supportive' },
  { value: 'direct', label: 'Direct' },
  { value: 'analytical', label: 'Analytical' },
];

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()} · ${hour}:${m} ${ampm}`;
}

interface ProfileProps {
  onSignOut: () => void;
  onClose?: () => void;
}

export default function ProfileScreen({ onSignOut, onClose }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState(0);
  const [tokenHistory, setTokenHistory] = useState<TokenHistoryEntry[]>([]);

  // Editable fields
  const [name, setName] = useState('');
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [difficulty, setDifficulty] = useState<GoalDifficulty>('moderate');
  const [aiTone, setAiTone] = useState<AiTone>('supportive');
  const [aboutMe, setAboutMe] = useState('');
  const [weeklyEmail, setWeeklyEmail] = useState(true);
  const [monthlyEmail, setMonthlyEmail] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const p = await getUserProfile();
        setProfile(p);
        if (p) {
          setName(p.name);
          setFocusAreas(p.focusAreas);
          setAiTone(p.aiTone);
        }
        const t = await getTokenBalance();
        setTokens(t);
        const th = await getTokenHistory();
        setTokenHistory(th);
        setLoading(false);
      })();
    }, [])
  );

  const toggleFocus = (area: FocusArea) => {
    setFocusAreas((prev) => {
      if (prev.includes(area)) return prev.filter((a) => a !== area);
      if (prev.length >= 3) return prev;
      return [...prev, area];
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      name: name.trim(),
      focusAreas,
      aiTone,
    };
    await saveUserProfile(updated);
    setProfile(updated);
    // Re-schedule notifications
    try {
      await registerForPushNotifications();
      await scheduleEveningReminder();
    } catch {}
    Alert.alert('Saved', 'Your profile has been updated.');
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          await AsyncStorage.clear();
          onSignOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('tf_day_entries').delete().eq('user_id', user.id);
                await supabase.from('tf_friend_requests').delete().eq('user_id', user.id);
                await supabase.from('tf_profiles').delete().eq('id', user.id);
              }
              await supabase.auth.signOut();
              await AsyncStorage.clear();
              onSignOut();
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color="#1A1A1A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Settings</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Section 1: Token Balance ─── */}
        <TouchableOpacity style={styles.tokenCard} activeOpacity={0.7}>
          <View style={styles.tokenCardLeft}>
            <Text style={styles.tokenCardIcon}>🪙</Text>
            <View>
              <Text style={styles.tokenCardTitle}>Tokens</Text>
              <Text style={styles.tokenCardSub}>For AI deep insights</Text>
            </View>
          </View>
          <Text style={styles.tokenCardBalance}>{tokens}</Text>
        </TouchableOpacity>

        {/* ─── Section 2: Token History ─── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={16} color="#A0A0A0" />
          <Text style={styles.sectionLabel}>Token History</Text>
        </View>

        {tokenHistory.length === 0 ? (
          <Text style={styles.emptyHistory}>No token usage yet</Text>
        ) : (
          tokenHistory.slice(0, 10).map((entry, i) => (
            <View key={i} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyLabel}>{entry.label}</Text>
                <Text style={styles.historyDate}>{formatHistoryDate(entry.date)}</Text>
              </View>
              <Text style={styles.historyAmount}>{entry.amount}</Text>
            </View>
          ))
        )}

        {/* ─── Section 3: Profile Settings ─── */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Ionicons name="person-outline" size={16} color="#A0A0A0" />
          <Text style={styles.sectionLabel}>Profile Settings</Text>
        </View>

        <Text style={styles.fieldLabel}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#A0A0A0"
        />

        <Text style={styles.fieldLabel}>Focus Areas (up to 3)</Text>
        <View style={styles.focusGrid}>
          {FOCUS_OPTIONS.map((opt) => {
            const selected = focusAreas.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.focusChip, selected && styles.focusChipSelected]}
                onPress={() => toggleFocus(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.focusChipText, selected && styles.focusChipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Goal Difficulty</Text>
        {DIFFICULTY_OPTIONS.map((opt) => {
          const selected = difficulty === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionRow, selected && styles.optionRowSelected]}
              onPress={() => setDifficulty(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {opt.label}
              </Text>
              {selected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.fieldLabel}>Daily Schedule</Text>
        <View style={styles.scheduleRow}>
          <View style={styles.scheduleBox}>
            <Text style={styles.scheduleLabel}>Morning setup</Text>
            <Text style={styles.scheduleTime}>7:00 AM</Text>
          </View>
          <View style={styles.scheduleBox}>
            <Text style={styles.scheduleLabel}>Evening check-in</Text>
            <Text style={styles.scheduleTime}>9:00 PM</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Coach Style</Text>
        {COACH_OPTIONS.map((opt) => {
          const selected = aiTone === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionRow, selected && styles.optionRowSelected]}
              onPress={() => setAiTone(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {opt.label}
              </Text>
              {selected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.fieldLabel}>About Me</Text>
        <View>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={aboutMe}
            onChangeText={(t) => setAboutMe(t.slice(0, 500))}
            placeholder="Tell us about yourself for better AI suggestions..."
            placeholderTextColor="#A0A0A0"
            multiline
            maxLength={500}
          />
          <Text style={styles.charCount}>{aboutMe.length}/500</Text>
        </View>

        {/* ─── Section 4: Email Insights ─── */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Ionicons name="mail-outline" size={16} color="#A0A0A0" />
          <Text style={styles.sectionLabel}>Email Insights</Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Weekly Pattern</Text>
            <Text style={styles.toggleSub}>Behavioral synthesis every week</Text>
          </View>
          <Switch
            value={weeklyEmail}
            onValueChange={setWeeklyEmail}
            trackColor={{ false: '#EDEDEB', true: '#1A1A1A' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Monthly Narrative</Text>
            <Text style={styles.toggleSub}>Identity reflection each month</Text>
          </View>
          <Switch
            value={monthlyEmail}
            onValueChange={setMonthlyEmail}
            trackColor={{ false: '#EDEDEB', true: '#1A1A1A' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.emailMeta}>
          <Text style={styles.emailMetaText}>Send Day: Sunday</Text>
          <Text style={styles.emailMetaText}>Time: 8:00 PM</Text>
          <Text style={styles.emailMetaText}>
            Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        {/* ─── Footer ─── */}
        <TouchableOpacity style={styles.signOutButton} activeOpacity={0.7} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} activeOpacity={0.7} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.footerEmail}>
          Signed in as {profile?.name || 'user'}@threefold.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingTop: 16, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  doneButton: { fontSize: 16, fontWeight: '500', color: '#6B6B6B' },

  /* Token card */
  tokenCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#EDEDEB', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  tokenCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tokenCardIcon: { fontSize: 28 },
  tokenCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  tokenCardSub: { fontSize: 13, color: '#A0A0A0', marginTop: 1 },
  tokenCardBalance: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },

  /* Section headers */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#A0A0A0', letterSpacing: 0.5 },

  /* Token history */
  emptyHistory: { fontSize: 14, color: '#A0A0A0', marginBottom: 16 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0EC',
  },
  historyLabel: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  historyDate: { fontSize: 12, color: '#A0A0A0', marginTop: 2 },
  historyAmount: { fontSize: 15, color: '#A0A0A0', fontWeight: '600' },

  /* Fields */
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8, marginTop: 18 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#EDEDEB', padding: 14, fontSize: 15, color: '#1A1A1A',
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#A0A0A0', textAlign: 'right', marginTop: 4 },

  /* Focus grid */
  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  focusChip: {
    width: '48%', paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    borderColor: '#EDEDEB', backgroundColor: '#FFFFFF', alignItems: 'center',
  },
  focusChipSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  focusChipText: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  focusChipTextSelected: { color: '#FFFFFF' },

  /* Stacked option rows */
  optionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#EDEDEB', padding: 14, marginBottom: 8,
  },
  optionRowSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  optionText: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  optionTextSelected: { color: '#FFFFFF' },

  /* Schedule */
  scheduleRow: { flexDirection: 'row', gap: 12 },
  scheduleBox: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#EDEDEB', padding: 14, alignItems: 'center',
  },
  scheduleLabel: { fontSize: 12, color: '#A0A0A0', marginBottom: 4 },
  scheduleTime: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },

  /* Email toggles */
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#EDEDEB',
    padding: 16, marginBottom: 8,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  toggleSub: { fontSize: 12, color: '#A0A0A0', marginTop: 2 },
  emailMeta: { marginTop: 8, gap: 4, marginBottom: 8 },
  emailMetaText: { fontSize: 13, color: '#A0A0A0' },

  /* Save */
  saveButton: {
    backgroundColor: '#1A1A1A', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  /* Footer */
  signOutButton: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 16, borderWidth: 1, borderColor: '#EDEDEB',
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  deleteButton: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  deleteText: { fontSize: 15, fontWeight: '500', color: '#D44' },
  footerEmail: { textAlign: 'center', fontSize: 12, color: '#A0A0A0', marginTop: 8 },
});
