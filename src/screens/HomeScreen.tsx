import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { UserProfile, DayEntry } from '../types';
import { getUserProfile, getTodayEntry, promoteToToday, getTodayDate } from '../lib/storage';

const GOAL_COLORS = {
  hard: '#FF6B6B',
  routine: '#4ECDC4',
  new: '#45B7D1',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }: any) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [today, setToday] = useState<DayEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    await promoteToToday();
    const p = await getUserProfile();
    const t = await getTodayEntry();
    setProfile(p);
    setToday(t);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color="#1A1A1A" />
        </View>
      </SafeAreaView>
    );
  }

  const hasGoals = today && (today.hardGoal || today.routineGoal || today.newGoal);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>
          {getGreeting()}{profile ? `, ${profile.name}` : ''}.
        </Text>

        {profile?.identityStatement && (
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Your north star</Text>
            <Text style={styles.identityText}>{profile.identityStatement}</Text>
          </View>
        )}

        {hasGoals ? (
          <>
            <Text style={styles.sectionTitle}>Today's goals</Text>

            <GoalRow
              color={GOAL_COLORS.hard}
              label="Hard"
              hint="Push your limits"
              goal={today!.hardGoal}
              status={today!.hardStatus}
            />
            <GoalRow
              color={GOAL_COLORS.routine}
              label="Routine"
              hint="Build consistency"
              goal={today!.routineGoal}
              status={today!.routineStatus}
            />
            <GoalRow
              color={GOAL_COLORS.new}
              label="New"
              hint="Try something fresh"
              goal={today!.newGoal}
              status={today!.newStatus}
            />

            {!today!.checkedIn && (
              <View style={styles.motivationCard}>
                <Text style={styles.motivationText}>
                  You planned these last night. Trust the version of you that was thinking clearly. Go make it happen.
                </Text>
              </View>
            )}

            {today!.checkedIn && (
              <View style={styles.checkedInCard}>
                <Text style={styles.checkedInText}>
                  You've checked in for today. Head to Plan to set up tomorrow.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No goals set for today</Text>
            <Text style={styles.emptyDesc}>
              Plan tomorrow tonight — head to the Plan tab to set your three goals.
            </Text>
            <TouchableOpacity
              style={styles.planButton}
              onPress={() => navigation.navigate('Plan')}
            >
              <Text style={styles.planButtonText}>Plan tomorrow</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalRow({ color, label, hint, goal, status }: {
  color: string;
  label: string;
  hint: string;
  goal: string;
  status: string | null;
}) {
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.goalLabel}>{label}</Text>
          <Text style={styles.goalHint}>{hint}</Text>
        </View>
        {status && (
          <View style={[
            styles.statusBadge,
            status === 'complete' && { backgroundColor: '#E8F5E9' },
            status === 'partial' && { backgroundColor: '#FFF8E1' },
            status === 'not_done' && { backgroundColor: '#FFEBEE' },
          ]}>
            <Text style={[
              styles.statusText,
              status === 'complete' && { color: '#2E7D32' },
              status === 'partial' && { color: '#F57F17' },
              status === 'not_done' && { color: '#C62828' },
            ]}>
              {status === 'complete' ? 'Done' : status === 'partial' ? 'Partial' : 'Missed'}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.goalText}>{goal}</Text>
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
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    marginBottom: 28,
  },
  identityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0A0A0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  identityText: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
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
    gap: 12,
  },
  goalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  goalHint: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  goalText: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 22,
    paddingLeft: 22,
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
  motivationCard: {
    backgroundColor: '#F5F5F0',
    borderRadius: 14,
    padding: 20,
    marginTop: 12,
  },
  motivationText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  checkedInCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 20,
    marginTop: 12,
  },
  checkedInText: {
    fontSize: 15,
    color: '#2E7D32',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  planButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  planButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
