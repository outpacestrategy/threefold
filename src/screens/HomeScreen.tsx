import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { DayEntry } from '../types';
import { getTodayEntry, promoteToToday } from '../lib/storage';

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

  const loadData = async () => {
    setLoading(true);
    await promoteToToday();
    const t = await getTodayEntry();
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.subtitle}>Set 3 intentions for today</Text>

        {/* Sleep quality card */}
        <View style={styles.sleepCard}>
          <Text style={styles.sleepLabel}>How did you sleep?</Text>
          <View style={styles.sleepRow}>
            {SLEEP_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.sleepOption,
                  sleepRating === i && styles.sleepOptionActive,
                ]}
                onPress={() => setSleepRating(i)}
                activeOpacity={0.7}
              >
                <Text style={styles.sleepEmoji}>{opt.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
                style={styles.stuckButton}
                onPress={() => setStuckGoal(cfg.key)}
                activeOpacity={0.6}
              >
                <Text style={styles.stuckButtonText}>💡 I'm stuck</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom sheet modal */}
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

            <TouchableOpacity style={styles.modalOption} activeOpacity={0.7}>
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
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

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

  /* Sleep card */
  sleepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    marginBottom: 20,
  },
  sleepLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  sleepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sleepOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5F5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepOptionActive: {
    backgroundColor: '#E8E6E1',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  sleepEmoji: {
    fontSize: 24,
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
  stuckButton: {
    alignSelf: 'flex-start',
    marginLeft: 30,
  },
  stuckButtonText: {
    fontSize: 14,
    color: '#6B6B6B',
    fontWeight: '500',
  },

  /* Modal / Bottom sheet */
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
});
