import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getHistory, getTokenBalance, spendToken, addTokenHistoryEntry, computeStreaks, StreakInfo } from '../lib/storage';
import { DayEntry } from '../types';
import StreakBadge from '../components/StreakBadge';
import TokenPurchaseModal from '../components/TokenPurchaseModal';

const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAYS_FULL[d.getDay()].toUpperCase()}, ${MONTHS_SHORT[d.getMonth()].toUpperCase()} ${d.getDate()}`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function computeStreak(history: DayEntry[]): number {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const entry of sorted) {
    const hasGoals = entry.hardGoal || entry.routineGoal || entry.newGoal;
    if (!hasGoals) continue;
    if (entry.checkedIn) streak++;
    else break;
  }
  return streak;
}

function countRoutines(history: DayEntry[]): { done: number; total: number } {
  let done = 0, total = 0;
  const recent = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  for (const e of recent) {
    if (e.routineGoal) {
      total++;
      if (e.routineStatus === 'complete') done++;
    }
  }
  return { done, total };
}

function goalCount(entry: DayEntry): { done: number; total: number } {
  let done = 0, total = 0;
  if (entry.hardGoal) { total++; if (entry.hardStatus === 'complete') done++; }
  if (entry.routineGoal) { total++; if (entry.routineStatus === 'complete') done++; }
  if (entry.newGoal) { total++; if (entry.newStatus === 'complete') done++; }
  return { done, total };
}

function narrativeSummary(entry: DayEntry): string {
  const { done, total } = goalCount(entry);
  if (done === total && total > 0) return 'Perfect day — all goals completed. That discipline compounds.';
  if (done === 0) return 'Tough day — none of the goals landed. Tomorrow is a reset.';
  const parts: string[] = [];
  if (entry.hardStatus === 'complete') parts.push('crushed your hard goal');
  else if (entry.hardGoal) parts.push('the hard goal slipped');
  if (entry.routineStatus === 'complete') parts.push('kept your routine');
  else if (entry.routineGoal) parts.push('routine got missed');
  if (entry.newStatus === 'complete') parts.push('tried something new');
  else if (entry.newGoal) parts.push('new goal didn\'t happen');
  return parts.length > 0 ? `You ${parts.join(', ')}.` : 'Mixed results today.';
}

export default function StatsScreen() {
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [tokens, setTokens] = useState(0);
  const [diveModal, setDiveModal] = useState<{ topic: string } | null>(null);
  const [streaks, setStreaks] = useState<StreakInfo>({ total: 0, hard: 0, routine: 0, new: 0 });
  const [showPurchase, setShowPurchase] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const h = await getHistory();
        setHistory(h);
        const t = await getTokenBalance();
        setTokens(t);
        setStreaks(computeStreaks(h));
      })();
    }, [])
  );

  const streak = useMemo(() => computeStreak(history), [history]);
  const routines = useMemo(() => countRoutines(history), [history]);
  const pastEntries = useMemo(() => {
    return [...history]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((e) => e.hardGoal || e.routineGoal || e.newGoal);
  }, [history]);

  const handleDive = async () => {
    if (tokens <= 0) {
      Alert.alert('No tokens remaining', 'Complete goals to earn more tokens.');
      return;
    }
    const newBal = await spendToken();
    setTokens(newBal);
    await addTokenHistoryEntry('Dive deeper: ' + (diveModal?.topic || ''), -1);
    setDiveModal(null);
    Alert.alert('Analysis generated', 'Check the Insights tab for your deep dive.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <StreakBadge streaks={streaks} />
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.helpBtn}>
            <Ionicons name="help-circle-outline" size={24} color="#A0A0A0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tokenPill} onPress={() => setShowPurchase(true)}>
            <Text style={styles.tokenPillText}>⚡ {tokens} tokens</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TODAY section */}
        <Text style={styles.sectionLabel}>TODAY</Text>

        {/* Streak card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🔥 {streak} day streak</Text>
            {streak > 0 && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardBody}>
            You've checked in {streak} day{streak !== 1 ? 's' : ''} in a row. Building momentum.
          </Text>
          <TouchableOpacity onPress={() => setDiveModal({ topic: `${streak} day streak` })}>
            <Text style={styles.diveLink}>⚡ Dive deeper</Text>
          </TouchableOpacity>
        </View>

        {/* Routine card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔄 Routine strength</Text>
          <Text style={styles.cardBody}>
            {routines.done}/{routines.total} routines completed this week. {routines.done === routines.total && routines.total > 0
              ? 'Perfect consistency — keep it locked in.'
              : 'This consistency is protecting your momentum.'}
          </Text>
          <TouchableOpacity onPress={() => setDiveModal({ topic: 'Routine strength' })}>
            <Text style={styles.diveLink}>⚡ Dive deeper</Text>
          </TouchableOpacity>
        </View>

        {/* Past entries */}
        {pastEntries.map((entry) => {
          const { done, total } = goalCount(entry);
          return (
            <View key={entry.date}>
              <Text style={styles.sectionLabel}>{formatDateLabel(entry.date)}</Text>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  ✨ {formatDateShort(entry.date)}: {done}/{total} goals
                </Text>
                <Text style={styles.cardBody}>{narrativeSummary(entry)}</Text>
                <View style={styles.tagsRow}>
                  {entry.hardGoal ? (
                    <View style={[styles.tag, entry.hardStatus === 'complete' ? styles.tagDone : styles.tagMissed]}>
                      <Text style={[styles.tagText, entry.hardStatus === 'complete' ? styles.tagTextDone : styles.tagTextMissed]}>
                        Hard {entry.hardStatus === 'complete' ? '✓' : '✗'}
                      </Text>
                    </View>
                  ) : null}
                  {entry.routineGoal ? (
                    <View style={[styles.tag, entry.routineStatus === 'complete' ? styles.tagDone : styles.tagMissed]}>
                      <Text style={[styles.tagText, entry.routineStatus === 'complete' ? styles.tagTextDone : styles.tagTextMissed]}>
                        Routine {entry.routineStatus === 'complete' ? '✓' : '✗'}
                      </Text>
                    </View>
                  ) : null}
                  {entry.newGoal ? (
                    <View style={[styles.tag, entry.newStatus === 'complete' ? styles.tagDone : styles.tagMissed]}>
                      <Text style={[styles.tagText, entry.newStatus === 'complete' ? styles.tagTextDone : styles.tagTextMissed]}>
                        New {entry.newStatus === 'complete' ? '✓' : '✗'}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => setDiveModal({ topic: `${formatDateShort(entry.date)}: ${done}/${total} goals` })}>
                  <Text style={styles.diveLink}>⚡ Dive deeper</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Dive Deeper modal */}
      <Modal
        visible={diveModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDiveModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDiveModal(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Dive Deeper</Text>
              <TouchableOpacity onPress={() => setDiveModal(null)}>
                <Ionicons name="close" size={24} color="#7A7A7A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{diveModal?.topic}</Text>
            <Text style={styles.modalTokens}>🪙 Your tokens: {tokens}</Text>
            <Text style={styles.modalBody}>
              Get AI-powered deep analysis of this insight. Uses 1 token.
            </Text>
            <TouchableOpacity style={styles.modalCta} onPress={handleDive} activeOpacity={0.8}>
              <Text style={styles.modalCtaText}>⚡ Dive Deeper (1 token)</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <TokenPurchaseModal visible={showPurchase} tokens={tokens} onClose={() => setShowPurchase(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
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
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpBtn: {
    padding: 4,
  },
  tokenPill: {
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tokenPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F57F17',
  },

  /* Content */
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0A0A0',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },

  /* Cards */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
  cardBody: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  diveLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
  },

  /* Tags */
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagDone: {
    backgroundColor: '#E8F5E9',
  },
  tagMissed: {
    backgroundColor: '#FFEBEE',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagTextDone: {
    color: '#2E7D32',
  },
  tagTextMissed: {
    color: '#C62828',
  },

  /* Dive Deeper modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#6B6B6B',
    marginBottom: 12,
  },
  modalTokens: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalCta: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
