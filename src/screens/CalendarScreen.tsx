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
import { getHistory, getTodayDate, getTodayEntry, computeStreaks } from '../lib/storage';
import { DayEntry, GoalStatus } from '../types';
import StreakBadge from '../components/StreakBadge';

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
    case 'all': return '#3DBBAA';
    case 'partial': return '#E8C84A';
    case 'missed': return '#D4574A';
    default: return null;
  }
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}


function getGoalStatusLabel(status: GoalStatus): string {
  if (status === 'complete') return 'Done';
  if (status === 'partial') return 'Partial';
  if (status === 'not_done') return 'Missed';
  return '';
}

export default function CalendarScreen({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayEntry | null>(null);

  const [todayEntry, setTodayEntry] = useState<DayEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const h = await getHistory();
        setHistory(h);
        const t = await getTodayEntry();
        setTodayEntry(t);
      })();
    }, [])
  );

  const historyMap = useMemo(() => {
    const map: Record<string, DayEntry> = {};
    history.forEach((e) => { map[e.date] = e; });
    // Merge today's entry so it always appears even if not yet in history
    if (todayEntry) {
      map[todayEntry.date] = todayEntry;
    }
    return map;
  }, [history, todayEntry]);

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
    // Show drawer for any past/present date — with or without goals
    setSelectedDay(entry || {
      date: dateStr,
      hardGoal: '',
      routineGoal: '',
      newGoal: '',
      hardStatus: null,
      routineStatus: null,
      newStatus: null,
      checkedIn: false,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <StreakBadge streaks={streaks} />
        <TouchableOpacity style={styles.avatar} onPress={onOpenProfile} activeOpacity={0.7}>
          <Ionicons name="person" size={18} color="#7A7A7A" />
        </TouchableOpacity>
      </View>

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
          <View style={[styles.legendDot, { backgroundColor: '#3DBBAA' }]} />
          <Text style={styles.legendText}>Done</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E8C84A' }]} />
          <Text style={styles.legendText}>Partial</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#D4574A' }]} />
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

            {selectedDay && (() => {
              const hasGoals = selectedDay.hardGoal || selectedDay.routineGoal || selectedDay.newGoal;
              const completed = [selectedDay.hardStatus, selectedDay.routineStatus, selectedDay.newStatus].filter(s => s === 'complete').length;
              const total = [selectedDay.hardGoal, selectedDay.routineGoal, selectedDay.newGoal].filter(Boolean).length;
              return (
              <ScrollView style={styles.modalBody}>
                {hasGoals ? (
                  <>
                    <Text style={styles.modalSummary}>
                      {completed}/{total} completed
                    </Text>
                    <GoalDetailRow
                      typeLabel="HARD"
                      typeColor="#E8584A"
                      goal={selectedDay.hardGoal}
                      status={selectedDay.hardStatus}
                    />
                    <GoalDetailRow
                      typeLabel="ROUTINE"
                      typeColor="#3DBBAA"
                      goal={selectedDay.routineGoal}
                      status={selectedDay.routineStatus}
                    />
                    <GoalDetailRow
                      typeLabel="NEW"
                      typeColor="#4A9FD9"
                      goal={selectedDay.newGoal}
                      status={selectedDay.newStatus}
                    />
                  </>
                ) : (
                  <Text style={styles.modalEmpty}>No goals were set for this day.</Text>
                )}
              </ScrollView>
              );
            })()}
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
    backgroundColor: '#FAFAF9',
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 6,
    zIndex: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFEFEC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Month nav */
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },

  /* Week header */
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#BBB',
    textTransform: 'uppercase',
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    borderRadius: 9,
    backgroundColor: '#F0EFEC',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Legend */
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingHorizontal: 24,
    paddingBottom: 36,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  modalBody: {
    flexGrow: 0,
  },
  modalSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
  },
  modalEmpty: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
    paddingVertical: 20,
  },

  /* Goal detail rows */
  goalDetailRow: {
    backgroundColor: '#FAFAF9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  goalDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalTypeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goalStatusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalDetailText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
});
