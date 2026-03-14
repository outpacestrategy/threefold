import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getHistory, getTodayDate } from '../lib/storage';
import { DayEntry, GoalStatus } from '../types';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

type DayStatus = 'all' | 'partial' | 'missed' | 'none';

function getDayStatus(entry: DayEntry | undefined): DayStatus {
  if (!entry) return 'none';
  const statuses = [entry.hardStatus, entry.routineStatus, entry.newStatus];
  const hasGoals = entry.hardGoal || entry.routineGoal || entry.newGoal;
  if (!hasGoals) return 'none';
  const completed = statuses.filter((s) => s === 'complete').length;
  if (completed === 3) return 'all';
  if (completed > 0) return 'partial';
  const hasAnyStatus = statuses.some((s) => s !== null);
  if (hasAnyStatus) return 'missed';
  return 'none';
}

function getStatusColor(status: DayStatus): string | null {
  switch (status) {
    case 'all': return '#34C759';
    case 'partial': return '#FFBD2E';
    case 'missed': return '#C62828';
    default: return null;
  }
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function computeStreaks(history: DayEntry[]): {
  total: number;
  hard: number;
  routine: number;
  new: number;
} {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let total = 0, hard = 0, routine = 0, newStreak = 0;
  let countingTotal = true, countingHard = true, countingRoutine = true, countingNew = true;

  for (const entry of sorted) {
    const hasGoals = entry.hardGoal || entry.routineGoal || entry.newGoal;
    if (!hasGoals) continue;

    if (countingTotal) {
      const allDone = entry.hardStatus === 'complete' && entry.routineStatus === 'complete' && entry.newStatus === 'complete';
      if (allDone) total++;
      else countingTotal = false;
    }
    if (countingHard) {
      if (entry.hardStatus === 'complete') hard++;
      else countingHard = false;
    }
    if (countingRoutine) {
      if (entry.routineStatus === 'complete') routine++;
      else countingRoutine = false;
    }
    if (countingNew) {
      if (entry.newStatus === 'complete') newStreak++;
      else countingNew = false;
    }
    if (!countingTotal && !countingHard && !countingRoutine && !countingNew) break;
  }

  return { total, hard, routine, new: newStreak };
}

function getGoalStatusLabel(status: GoalStatus): string {
  if (status === 'complete') return 'Done';
  if (status === 'partial') return 'Partial';
  if (status === 'not_done') return 'Missed';
  return '';
}

export default function CalendarScreen() {
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayEntry | null>(null);
  const [showStreaks, setShowStreaks] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const h = await getHistory();
        setHistory(h);
      })();
    }, [])
  );

  const historyMap = useMemo(() => {
    const map: Record<string, DayEntry> = {};
    history.forEach((e) => { map[e.date] = e; });
    return map;
  }, [history]);

  const streaks = useMemo(() => computeStreaks(history), [history]);

  const todayStr = getTodayDate();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const goToPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goToNext = () => setViewDate(new Date(year, month + 1, 1));

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const handleDayPress = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr > todayStr) return;
    const entry = historyMap[dateStr];
    if (entry) setSelectedDay(entry);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.streakBadge}
          onPress={() => setShowStreaks(!showStreaks)}
          activeOpacity={0.7}
        >
          <Text style={styles.streakText}>↗ {streaks.total} days</Text>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color="#7A7A7A" />
        </View>
      </View>

      {/* Streak dropdown */}
      {showStreaks && (
        <View style={styles.streakDropdown}>
          <Text style={styles.streakDropdownRow}>
            Total: {streaks.total} days
          </Text>
          <Text style={[styles.streakDropdownRow, { color: '#FF6B6B' }]}>
            🔥 Hard: {streaks.hard} days
          </Text>
          <Text style={[styles.streakDropdownRow, { color: '#4ECDC4' }]}>
            🔄 Routine: {streaks.routine} days
          </Text>
          <Text style={[styles.streakDropdownRow, { color: '#45B7D1' }]}>
            ✨ New: {streaks.new} days
          </Text>
        </View>
      )}

      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity onPress={goToNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-forward" size={22} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((d, i) => (
          <Text key={i} style={styles.weekLabel}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarCells.map((day, i) => {
          if (day === null) {
            return <View key={i} style={styles.cell} />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entry = historyMap[dateStr];
          const status = getDayStatus(entry);
          const color = getStatusColor(status);
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                styles.dayCell,
                color ? { backgroundColor: color } : { backgroundColor: '#F0F0EC' },
                isToday && styles.todayCell,
                isFuture && { opacity: 0.4 },
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={0.7}
              disabled={isFuture}
            >
              <Text
                style={[
                  styles.dayText,
                  color ? { color: '#FFFFFF' } : { color: '#1A1A1A' },
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>All done</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFBD2E' }]} />
          <Text style={styles.legendText}>Partial</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#C62828' }]} />
          <Text style={styles.legendText}>Missed</Text>
        </View>
      </View>

      {/* Day detail bottom sheet */}
      <Modal
        visible={selectedDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDay(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalDate}>
                {selectedDay ? formatDayHeader(selectedDay.date) : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Ionicons name="close" size={24} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            {selectedDay && (
              <ScrollView style={styles.modalBody}>
                <GoalDetailRow
                  typeLabel="HARD"
                  typeColor="#FF6B6B"
                  goal={selectedDay.hardGoal}
                  status={selectedDay.hardStatus}
                />
                <GoalDetailRow
                  typeLabel="ROUTINE"
                  typeColor="#4ECDC4"
                  goal={selectedDay.routineGoal}
                  status={selectedDay.routineStatus}
                />
                <GoalDetailRow
                  typeLabel="NEW"
                  typeColor="#45B7D1"
                  goal={selectedDay.newGoal}
                  status={selectedDay.newStatus}
                />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function GoalDetailRow({ typeLabel, typeColor, goal, status }: {
  typeLabel: string;
  typeColor: string;
  goal: string;
  status: GoalStatus;
}) {
  const isDone = status === 'complete';
  return (
    <View style={styles.goalDetailRow}>
      <View style={styles.goalDetailHeader}>
        <Text style={[styles.goalTypeLabel, { color: typeColor }]}>{typeLabel}</Text>
        {status && (
          <Text style={[
            styles.goalStatusLabel,
            isDone ? { color: '#2E7D32' } : { color: '#A0A0A0' },
          ]}>
            {getGoalStatusLabel(status)}
          </Text>
        )}
      </View>
      <Text style={[
        styles.goalDetailText,
        !isDone && status !== null && { color: '#A0A0A0' },
      ]}>
        {goal || 'No goal set'}
      </Text>
    </View>
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
  },
  streakBadge: {
    backgroundColor: '#E6F7F1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2AA87E',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Streak dropdown */
  streakDropdown: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  streakDropdownRow: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },

  /* Month nav */
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  /* Week header */
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#A0A0A0',
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    borderRadius: 10,
    backgroundColor: '#F0F0EC',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Legend */
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#7A7A7A',
    fontWeight: '500',
  },

  /* Modal */
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
    maxHeight: '60%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalBody: {
    flexGrow: 0,
  },

  /* Goal detail rows */
  goalDetailRow: {
    backgroundColor: '#FAF9F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  goalDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  goalStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalDetailText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 22,
  },
});
