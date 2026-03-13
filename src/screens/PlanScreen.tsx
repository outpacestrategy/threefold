import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import {
  getTodayEntry,
  saveTodayEntry,
  getTomorrowEntry,
  saveTomorrowEntry,
  addToHistory,
  getUserProfile,
  getTodayDate,
  getTomorrowDate,
} from '../lib/storage';
import { DayEntry, TomorrowEntry, GoalStatus, GoalType, UserProfile } from '../types';

const GOAL_COLORS = {
  hard: '#FF6B6B',
  routine: '#4ECDC4',
  new: '#45B7D1',
};

const STATUS_OPTIONS: { value: GoalStatus; label: string; emoji: string }[] = [
  { value: 'complete', label: 'Done', emoji: '' },
  { value: 'partial', label: 'Partial', emoji: '' },
  { value: 'not_done', label: 'Missed', emoji: '' },
];

export default function PlanScreen() {
  const [phase, setPhase] = useState<'checkin' | 'plan'>('checkin');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Check-in state
  const [today, setToday] = useState<DayEntry | null>(null);
  const [hardStatus, setHardStatus] = useState<GoalStatus>(null);
  const [routineStatus, setRoutineStatus] = useState<GoalStatus>(null);
  const [newStatus, setNewStatus] = useState<GoalStatus>(null);
  const [reflection, setReflection] = useState('');

  // Plan state
  const [hardGoal, setHardGoal] = useState('');
  const [routineGoal, setRoutineGoal] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [hardFriend, setHardFriend] = useState('');
  const [routineFriend, setRoutineFriend] = useState('');
  const [newFriend, setNewFriend] = useState('');
  const [waitingFor, setWaitingFor] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    const p = await getUserProfile();
    setProfile(p);
    const t = await getTodayEntry();
    setToday(t);

    if (t && !t.checkedIn && (t.hardGoal || t.routineGoal || t.newGoal)) {
      setPhase('checkin');
      setHardStatus(t.hardStatus);
      setRoutineStatus(t.routineStatus);
      setNewStatus(t.newStatus);
      setReflection(t.reflection || '');
    } else {
      setPhase('plan');
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
      }
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleCheckIn = async () => {
    if (!today) return;
    const updated: DayEntry = {
      ...today,
      hardStatus,
      routineStatus,
      newStatus,
      reflection: reflection.trim(),
      checkedIn: true,
    };
    await saveTodayEntry(updated);
    await addToHistory(updated);
    setToday(updated);
    setPhase('plan');

    // Load existing tomorrow plan if any
    const tm = await getTomorrowEntry();
    if (tm) {
      setHardGoal(tm.hardGoal || '');
      setRoutineGoal(tm.routineGoal || '');
      setNewGoal(tm.newGoal || '');
    }
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
    Alert.alert('Tomorrow is planned', "Rest easy — you've already won half the battle.");
  };

  const handlePhoneAFriend = async (goalType: GoalType) => {
    const goalLabel = goalType === 'hard' ? 'Hard' : goalType === 'routine' ? 'Routine' : 'New';

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        // Fallback: manual entry
        Alert.alert('Contacts permission needed', 'Enable contacts in Settings to use Phone a Friend.');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length > 0) {
        // For simplicity, just take first contact with a phone — in production use a picker
        // We'll send SMS directly
        const contact = data.find((c) => c.phoneNumbers && c.phoneNumbers.length > 0);
        if (!contact || !contact.phoneNumbers) {
          Alert.alert('No contacts with phone numbers found');
          return;
        }

        const friendName = contact.name || 'Your friend';
        const phone = contact.phoneNumbers[0].number || '';
        const userName = profile?.name || 'Your friend';

        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          const link = `threefold.drewtegui.com/friend?goalType=${goalType}&userId=user`;
          await SMS.sendSMSAsync(
            [phone],
            `${userName} is planning tomorrow and needs your help picking their ${goalLabel} goal. You know them — what should they do? Reply here: ${link}`
          );

          if (goalType === 'hard') setHardFriend(friendName);
          else if (goalType === 'routine') setRoutineFriend(friendName);
          else setNewFriend(friendName);
          setWaitingFor((prev) => ({ ...prev, [goalType]: friendName }));
        } else {
          Alert.alert('SMS not available', 'SMS is not available on this device.');
        }
      }
    } catch (e) {
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

  if (phase === 'checkin' && today && !today.checkedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>How did today go?</Text>
            <Text style={styles.subheading}>Check in on your goals before planning tomorrow.</Text>

            {today.hardGoal ? (
              <StatusRow
                color={GOAL_COLORS.hard}
                label="Hard"
                goal={today.hardGoal}
                status={hardStatus}
                onSelect={setHardStatus}
              />
            ) : null}
            {today.routineGoal ? (
              <StatusRow
                color={GOAL_COLORS.routine}
                label="Routine"
                goal={today.routineGoal}
                status={routineStatus}
                onSelect={setRoutineStatus}
              />
            ) : null}
            {today.newGoal ? (
              <StatusRow
                color={GOAL_COLORS.new}
                label="New"
                goal={today.newGoal}
                status={newStatus}
                onSelect={setNewStatus}
              />
            ) : null}

            <Text style={styles.reflectionLabel}>Reflection (optional)</Text>
            <TextInput
              style={styles.reflectionInput}
              placeholder="How are you feeling about today?"
              placeholderTextColor="#A0A0A0"
              value={reflection}
              onChangeText={setReflection}
              multiline
            />

            <TouchableOpacity style={styles.button} onPress={handleCheckIn}>
              <Text style={styles.buttonText}>Continue to plan tomorrow</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Plan phase
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Plan tomorrow</Text>
          <Text style={styles.subheading}>Set three intentional goals for tomorrow.</Text>

          <PlanGoalSlot
            color={GOAL_COLORS.hard}
            label="Hard goal"
            hint="Push your limits"
            value={hardGoal}
            onChangeText={setHardGoal}
            friendName={waitingFor.hard || hardFriend}
            onPhoneAFriend={() => handlePhoneAFriend('hard')}
          />

          <PlanGoalSlot
            color={GOAL_COLORS.routine}
            label="Routine goal"
            hint="Build consistency"
            value={routineGoal}
            onChangeText={setRoutineGoal}
            friendName={waitingFor.routine || routineFriend}
            onPhoneAFriend={() => handlePhoneAFriend('routine')}
          />

          <PlanGoalSlot
            color={GOAL_COLORS.new}
            label="New goal"
            hint="Try something fresh"
            value={newGoal}
            onChangeText={setNewGoal}
            friendName={waitingFor.new || newFriend}
            onPhoneAFriend={() => handlePhoneAFriend('new')}
          />

          <TouchableOpacity style={styles.button} onPress={handleSavePlan}>
            <Text style={styles.buttonText}>Lock in tomorrow</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatusRow({ color, label, goal, status, onSelect }: {
  color: string;
  label: string;
  goal: string;
  status: GoalStatus;
  onSelect: (s: GoalStatus) => void;
}) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View style={[styles.goalDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>{label}</Text>
          <Text style={styles.statusGoal}>{goal}</Text>
        </View>
      </View>
      <View style={styles.statusOptions}>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.statusOption,
              status === opt.value && styles.statusOptionSelected,
              status === opt.value && opt.value === 'complete' && { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
              status === opt.value && opt.value === 'partial' && { backgroundColor: '#FFF8E1', borderColor: '#FFE082' },
              status === opt.value && opt.value === 'not_done' && { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[
              styles.statusOptionText,
              status === opt.value && opt.value === 'complete' && { color: '#2E7D32' },
              status === opt.value && opt.value === 'partial' && { color: '#F57F17' },
              status === opt.value && opt.value === 'not_done' && { color: '#C62828' },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function PlanGoalSlot({ color, label, hint, value, onChangeText, friendName, onPhoneAFriend }: {
  color: string;
  label: string;
  hint: string;
  value: string;
  onChangeText: (t: string) => void;
  friendName?: string;
  onPhoneAFriend: () => void;
}) {
  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={[styles.goalDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.planLabel}>{label}</Text>
          <Text style={styles.planHint}>{hint}</Text>
        </View>
      </View>

      {friendName && !value ? (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>Waiting for {friendName}...</Text>
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Text style={styles.fillSelfLink}>Fill it yourself</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TextInput
        style={styles.planInput}
        placeholder="What's the goal?"
        placeholderTextColor="#A0A0A0"
        value={value}
        onChangeText={onChangeText}
      />

      {friendName && value ? (
        <Text style={styles.suggestedBy}>Suggested by {friendName}</Text>
      ) : null}

      <TouchableOpacity style={styles.friendButton} onPress={onPhoneAFriend}>
        <Text style={styles.friendButtonText}>Phone a Friend</Text>
      </TouchableOpacity>
    </View>
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
  content: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subheading: {
    fontSize: 17,
    color: '#7A7A7A',
    marginTop: 4,
    marginBottom: 28,
  },
  // Check-in styles
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  goalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A0A0A0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusGoal: {
    fontSize: 16,
    color: '#1A1A1A',
    marginTop: 2,
    lineHeight: 22,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 22,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusOptionSelected: {
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7A7A',
  },
  reflectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 8,
  },
  reflectionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    padding: 16,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  // Plan styles
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  planHint: {
    fontSize: 13,
    color: '#A0A0A0',
    marginTop: 2,
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
  button: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
