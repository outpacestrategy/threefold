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

type TabMode = 'weekly' | 'monthly';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
  return sunday.toISOString().split('T')[0];
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function formatWeekRange(weekKey: string): string {
  const start = new Date(weekKey + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${MONTHS_FULL[parseInt(m, 10) - 1]} ${y}`;
}

interface InsightCard {
  key: string;
  label: string;
  entries: DayEntry[];
}

function generateSummary(entries: DayEntry[]): {
  completionRate: number;
  hardRate: number;
  routineRate: number;
  newRate: number;
  totalGoals: number;
  totalDone: number;
  narrative: string;
} {
  let totalGoals = 0, totalDone = 0;
  let hardTotal = 0, hardDone = 0;
  let routineTotal = 0, routineDone = 0;
  let newTotal = 0, newDone = 0;

  for (const e of entries) {
    if (e.hardGoal) { hardTotal++; totalGoals++; if (e.hardStatus === 'complete') { hardDone++; totalDone++; } }
    if (e.routineGoal) { routineTotal++; totalGoals++; if (e.routineStatus === 'complete') { routineDone++; totalDone++; } }
    if (e.newGoal) { newTotal++; totalGoals++; if (e.newStatus === 'complete') { newDone++; totalDone++; } }
  }

  const completionRate = totalGoals > 0 ? Math.round((totalDone / totalGoals) * 100) : 0;
  const hardRate = hardTotal > 0 ? Math.round((hardDone / hardTotal) * 100) : 0;
  const routineRate = routineTotal > 0 ? Math.round((routineDone / routineTotal) * 100) : 0;
  const newRate = newTotal > 0 ? Math.round((newDone / newTotal) * 100) : 0;

  let narrative: string;
  if (completionRate >= 80) {
    narrative = `Strong period — ${completionRate}% completion rate across ${entries.length} days. Your consistency is compounding.`;
  } else if (completionRate >= 50) {
    narrative = `Mixed results — ${completionRate}% completion. Routines held at ${routineRate}% but hard goals dropped to ${hardRate}%.`;
  } else {
    narrative = `Tough stretch — only ${completionRate}% completion. Consider whether your goals are sized right for this season.`;
  }

  return { completionRate, hardRate, routineRate, newRate, totalGoals, totalDone, narrative };
}

export default function InsightsScreen() {
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [mode, setMode] = useState<TabMode>('weekly');
  const [tokens, setTokens] = useState(0);
  const [diveModal, setDiveModal] = useState<{ topic: string } | null>(null);
  const [streaks, setStreaks] = useState<StreakInfo>({ total: 0, hard: 0, routine: 0, new: 0 });

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

  const handleDive = async () => {
    if (tokens <= 0) {
      Alert.alert('No tokens remaining', 'Complete goals to earn more tokens.');
      return;
    }
    const newBal = await spendToken();
    setTokens(newBal);
    await addTokenHistoryEntry('Dive deeper: ' + (diveModal?.topic || ''), -1);
    setDiveModal(null);
    Alert.alert('Analysis generated', 'Your deep dive insight is ready.');
  };

  const hasEnoughData = history.filter((e) => e.hardGoal || e.routineGoal || e.newGoal).length >= 7;

  const insightCards: InsightCard[] = useMemo(() => {
    const validEntries = history.filter((e) => e.hardGoal || e.routineGoal || e.newGoal);
    const grouped: Record<string, DayEntry[]> = {};

    for (const e of validEntries) {
      const key = mode === 'weekly' ? getWeekKey(e.date) : getMonthKey(e.date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, entries]) => ({
        key,
        label: mode === 'weekly' ? formatWeekRange(key) : formatMonthLabel(key),
        entries,
      }));
  }, [history, mode]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <StreakBadge streaks={streaks} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Insights</Text>
        <Text style={styles.subheading}>
          Receipts of growth. No edits. Just what the data showed.
        </Text>
      </View>

      {/* Toggle bar */}
      <View style={styles.toggleBar}>
        <TouchableOpacity
          style={[styles.toggleOption, mode === 'weekly' && styles.toggleActive]}
          onPress={() => setMode('weekly')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, mode === 'weekly' && styles.toggleTextActive]}>
            💡 Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleOption, mode === 'monthly' && styles.toggleActive]}
          onPress={() => setMode('monthly')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, mode === 'monthly' && styles.toggleTextActive]}>
            📖 Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {!hasEnoughData ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="bulb-outline" size={48} color="#C0C0C0" />
          </View>
          <Text style={styles.emptyTitle}>No insights yet</Text>
          <Text style={styles.emptyDesc}>
            Complete your first week of check-ins to generate your first weekly insight.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {insightCards.map((card) => {
            const summary = generateSummary(card.entries);
            return (
              <View key={card.key} style={styles.card}>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text style={styles.cardRate}>{summary.completionRate}% completion</Text>
                <Text style={styles.cardNarrative}>{summary.narrative}</Text>
                <View style={styles.rateRow}>
                  <View style={styles.ratePill}>
                    <Text style={[styles.ratePillText, { color: '#FF6B6B' }]}>
                      🔥 Hard {summary.hardRate}%
                    </Text>
                  </View>
                  <View style={styles.ratePill}>
                    <Text style={[styles.ratePillText, { color: '#4ECDC4' }]}>
                      🔄 Routine {summary.routineRate}%
                    </Text>
                  </View>
                  <View style={styles.ratePill}>
                    <Text style={[styles.ratePillText, { color: '#45B7D1' }]}>
                      ✨ New {summary.newRate}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {card.entries.length} days tracked · {summary.totalDone}/{summary.totalGoals} goals hit
                </Text>
                <TouchableOpacity
                  style={styles.diveButton}
                  onPress={() => setDiveModal({ topic: `${card.label} — ${summary.completionRate}% completion` })}
                >
                  <Text style={styles.diveLink}>⚡ Dive deeper</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
  },

  /* Header */
  header: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDEB',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#7A7A7A',
    lineHeight: 20,
  },

  /* Toggle bar */
  toggleBar: {
    flexDirection: 'row',
    backgroundColor: '#F0F0EC',
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0A0A0',
  },
  toggleTextActive: {
    color: '#1A1A1A',
  },

  /* Empty state */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 22,
  },

  /* Insight cards */
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A0A0A0',
    marginBottom: 6,
  },
  cardRate: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  cardNarrative: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 14,
  },
  rateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  ratePill: {
    backgroundColor: '#F5F5F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  diveButton: {
    marginTop: 12,
  },
  diveLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
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
