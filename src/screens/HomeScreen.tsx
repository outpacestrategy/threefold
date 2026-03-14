import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { DayEntry, TomorrowEntry, GoalType } from '../types';
import {
  getTodayEntry,
  saveTodayEntry,
  promoteToToday,
  getTomorrowEntry,
  saveTomorrowEntry,
  getUserProfile,
  getTomorrowDate,
  getHistory,
  getTokenBalance,
  spendToken,
  addTokenHistoryEntry,
  computeStreaks,
  StreakInfo,
} from '../lib/storage';
import StreakBadge from '../components/StreakBadge';

const SLEEP_OPTIONS = [
  { emoji: '🌧️', label: 'Awful' },
  { emoji: '😢', label: 'Bad' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😁', label: 'Great' },
];

const GOAL_CONFIG = [
  { key: 'hard' as const, emoji: '🔥', label: 'Hard', hint: 'Push your limits', color: '#FF6B6B' },
  { key: 'routine' as const, emoji: '🔄', label: 'Routine', hint: 'Build consistency', color: '#4ECDC4' },
  { key: 'new' as const, emoji: '✨', label: 'New', hint: 'Try something fresh', color: '#45B7D1' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const [today, setToday] = useState<DayEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [sleepRating, setSleepRating] = useState<number | null>(null);
  const [stuckGoal, setStuckGoal] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [streaks, setStreaks] = useState<StreakInfo>({ total: 0, hard: 0, routine: 0, new: 0 });
  const [tokens, setTokens] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({ hard: '', routine: '', new: '' });
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  // Plan modal state
  const [hardGoal, setHardGoal] = useState('');
  const [routineGoal, setRoutineGoal] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [hardFriend, setHardFriend] = useState('');
  const [routineFriend, setRoutineFriend] = useState('');
  const [newFriend, setNewFriend] = useState('');
  const [waitingFor, setWaitingFor] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    await promoteToToday();
    const t = await getTodayEntry();
    setToday(t);
    if (t) {
      setNotes({ hard: t.hardNote || '', routine: t.routineNote || '', new: t.newNote || '' });
    }
    const history = await getHistory();
    setStreaks(computeStreaks(history));
    const bal = await getTokenBalance();
    setTokens(bal);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const saveNote = async (key: string, value: string) => {
    setNotes((prev) => ({ ...prev, [key]: value }));
    if (today) {
      const updated = { ...today, [`${key}Note`]: value };
      await saveTodayEntry(updated as DayEntry);
      setToday(updated as DayEntry);
    }
  };

  const openPlanModal = async () => {
    const tm = await getTomorrowEntry();
    if (tm) {
      setHardGoal(tm.hardGoal || '');
      setRoutineGoal(tm.routineGoal || '');
      setNewGoal(tm.newGoal || '');
      setHardFriend(tm.hardFriendName || '');
      setRoutineFriend(tm.routineFriendName || '');
      setNewFriend(tm.newFriendName || '');
    } else {
      setHardGoal('');
      setRoutineGoal('');
      setNewGoal('');
      setHardFriend('');
      setRoutineFriend('');
      setNewFriend('');
    }
    setWaitingFor({});
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!hardGoal.trim() || !routineGoal.trim() || !newGoal.trim()) {
      Alert.alert('Set all three goals', 'Each slot needs a goal to plan your day.');
      return;
    }
    const entry: TomorrowEntry = {
      date: getTomorrowDate(),
      hardGoal: hardGoal.trim(),
      routineGoal: routineGoal.trim(),
      newGoal: newGoal.trim(),
      hardFriendName: hardFriend || undefined,
      routineFriendName: routineFriend || undefined,
      newFriendName: newFriend || undefined,
    };
    await saveTomorrowEntry(entry);
    setShowPlanModal(false);
    Alert.alert('Tomorrow is planned', "Rest easy — you've already won half the battle.");
  };

  const handlePhoneAFriend = async (goalType: GoalType) => {
    const goalLabel = goalType === 'hard' ? 'Hard' : goalType === 'routine' ? 'Routine' : 'New';
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Contacts permission needed', 'Enable contacts in Settings to use Phone a Friend.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      if (data.length > 0) {
        const contact = data.find((c) => c.phoneNumbers && c.phoneNumbers.length > 0);
        if (!contact || !contact.phoneNumbers) {
          Alert.alert('No contacts with phone numbers found');
          return;
        }
        const friendName = contact.name || 'Your friend';
        const phone = contact.phoneNumbers[0].number || '';
        const profile = await getUserProfile();
        const userName = profile?.name || 'Your friend';

        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          await SMS.sendSMSAsync(
            [phone],
            `${userName} is planning tomorrow and needs your help picking their ${goalLabel} goal. What should they do?`
          );
          if (goalType === 'hard') setHardFriend(friendName);
          else if (goalType === 'routine') setRoutineFriend(friendName);
          else setNewFriend(friendName);
          setWaitingFor((prev) => ({ ...prev, [goalType]: friendName }));
        } else {
          Alert.alert('SMS not available', 'SMS is not available on this device.');
        }
      }
    } catch {
      Alert.alert('Could not access contacts');
    }
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

  const goalTextMap: Record<string, string> = {
    hard: today?.hardGoal || '',
    routine: today?.routineGoal || '',
    new: today?.newGoal || '',
  };

  const statusMap: Record<string, string | null> = {
    hard: today?.hardStatus ?? null,
    routine: today?.routineStatus ?? null,
    new: today?.newStatus ?? null,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <StreakBadge streaks={streaks} />
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color="#7A7A7A" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.subtitle}>Set 3 intentions for today</Text>

        {/* Sleep quality */}
        <Text style={styles.sleepLabel}>How did you sleep?</Text>
        <View style={styles.sleepRow}>
          {SLEEP_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSleepRating(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sleepEmoji, sleepRating === i && styles.sleepEmojiActive]}>
                {opt.emoji}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal cards */}
        {GOAL_CONFIG.map((cfg) => {
          const goalText = goalTextMap[cfg.key];
          const status = statusMap[cfg.key];
          return (
            <View key={cfg.key} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalEmoji}>{cfg.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalLabel}>{cfg.label}</Text>
                  <Text style={styles.goalHint}>{cfg.hint}</Text>
                </View>
                {status && (
                  <View
                    style={[
                      styles.statusBadge,
                      status === 'complete' && { backgroundColor: '#E8F5E9' },
                      status === 'partial' && { backgroundColor: '#FFF8E1' },
                      status === 'not_done' && { backgroundColor: '#FFEBEE' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        status === 'complete' && { color: '#2E7D32' },
                        status === 'partial' && { color: '#F57F17' },
                        status === 'not_done' && { color: '#C62828' },
                      ]}
                    >
                      {status === 'complete' ? 'Done' : status === 'partial' ? 'Partial' : 'Missed'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.goalText}>
                {goalText || 'No goal set yet'}
              </Text>

              <TouchableOpacity
                style={styles.noteToggle}
                onPress={() => setExpandedNote(expandedNote === cfg.key ? null : cfg.key)}
                activeOpacity={0.6}
              >
                <Text style={styles.noteToggleText}>
                  {expandedNote === cfg.key ? '📝 Hide notes' : '📝 Add notes'}
                </Text>
              </TouchableOpacity>

              {expandedNote === cfg.key && (
                <TextInput
                  style={styles.noteInput}
                  placeholder="Jot down thoughts, progress, or reflections..."
                  placeholderTextColor="#A0A0A0"
                  value={notes[cfg.key]}
                  onChangeText={(text) => saveNote(cfg.key, text)}
                  multiline
                />
              )}
            </View>
          );
        })}

        {/* Plan tomorrow button */}
        <TouchableOpacity
          style={styles.planCta}
          onPress={openPlanModal}
          activeOpacity={0.8}
        >
          <Text style={styles.planCtaText}>Plan tomorrow</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── "I'm stuck" bottom sheet ─── */}
      <Modal
        visible={stuckGoal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setStuckGoal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStuckGoal(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Need help deciding?</Text>

            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.7}
              onPress={async () => {
                if (tokens <= 0) {
                  Alert.alert('No tokens remaining', 'You need tokens to use this feature.');
                  return;
                }
                const newBal = await spendToken();
                setTokens(newBal);
                await addTokenHistoryEntry('Recommend 3 tasks', -1);
                setStuckGoal(null);
                Alert.alert('Recommendations ready', 'AI suggestions have been generated for your goals.');
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionLabel}>💡 Recommend 3 tasks</Text>
                <Text style={styles.modalOptionSub}>
                  AI-powered suggestions based on your patterns
                </Text>
              </View>
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenText}>🪙 1 token</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionLabel}>👥 Phone a friend</Text>
                <Text style={styles.modalOptionSub}>
                  Let someone help you choose
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Plan Tomorrow modal ─── */}
      <Modal
        visible={showPlanModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.planModalHeader}>
                <Text style={styles.planModalTitle}>Plan tomorrow</Text>
                <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                  <Text style={styles.planModalClose}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.planModalSubtitle}>
                Set three intentional goals for tomorrow.
              </Text>

              {GOAL_CONFIG.map((cfg) => {
                const goalValue =
                  cfg.key === 'hard' ? hardGoal : cfg.key === 'routine' ? routineGoal : newGoal;
                const setGoalValue =
                  cfg.key === 'hard' ? setHardGoal : cfg.key === 'routine' ? setRoutineGoal : setNewGoal;
                const friend =
                  cfg.key === 'hard' ? hardFriend : cfg.key === 'routine' ? routineFriend : newFriend;
                const waiting = waitingFor[cfg.key];

                return (
                  <View key={cfg.key} style={styles.planCard}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalEmoji}>{cfg.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalLabel}>{cfg.label} goal</Text>
                        <Text style={styles.goalHint}>{cfg.hint}</Text>
                      </View>
                    </View>

                    {waiting && !goalValue ? (
                      <View style={styles.waitingBox}>
                        <Text style={styles.waitingText}>Waiting for {waiting}...</Text>
                        <TouchableOpacity onPress={() => setGoalValue('')}>
                          <Text style={styles.fillSelfLink}>Fill it yourself</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    <TextInput
                      style={styles.planInput}
                      placeholder="What's the goal?"
                      placeholderTextColor="#A0A0A0"
                      value={goalValue}
                      onChangeText={setGoalValue}
                    />

                    {friend && goalValue ? (
                      <Text style={styles.suggestedBy}>Suggested by {friend}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={styles.friendButton}
                      onPress={() => handlePhoneAFriend(cfg.key)}
                    >
                      <Text style={styles.friendButtonText}>Phone a Friend</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.stuckButton}
                      onPress={() => { setShowPlanModal(false); setStuckGoal(cfg.key); }}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.stuckButtonText}>💡 I'm stuck</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              <TouchableOpacity style={styles.lockInButton} onPress={handleSavePlan}>
                <Text style={styles.lockInButtonText}>Lock in tomorrow</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Top bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* Header */
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B6B6B',
    marginBottom: 24,
  },

  /* Sleep */
  sleepLabel: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  sleepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  sleepEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  sleepEmojiActive: {
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },

  /* Goal cards */
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  goalEmoji: {
    fontSize: 20,
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  goalHint: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 1,
  },
  goalText: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 22,
    paddingLeft: 30,
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteToggle: {
    alignSelf: 'flex-start',
    marginLeft: 30,
  },
  noteToggleText: {
    fontSize: 13,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  noteInput: {
    backgroundColor: '#F9F9F7',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1A1A1A',
    marginTop: 10,
    marginLeft: 30,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  stuckButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  stuckButtonText: {
    fontSize: 14,
    color: '#6B6B6B',
    fontWeight: '500',
  },

  /* Plan tomorrow CTA */
  planCta: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  planCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  /* "I'm stuck" bottom sheet */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F7',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  modalOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modalOptionSub: {
    fontSize: 13,
    color: '#6B6B6B',
    lineHeight: 18,
  },
  tokenBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 12,
  },
  tokenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F57F17',
  },

  /* Plan modal */
  planModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  planModalClose: {
    fontSize: 16,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  planModalSubtitle: {
    fontSize: 16,
    color: '#6B6B6B',
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  planInput: {
    backgroundColor: '#F9F9F7',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  friendButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  friendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7A7A',
  },
  waitingBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 14,
    color: '#F57F17',
    fontWeight: '500',
  },
  fillSelfLink: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  suggestedBy: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 6,
    fontStyle: 'italic',
  },
  lockInButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  lockInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
