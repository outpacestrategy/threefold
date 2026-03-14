import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface StreakData {
  total: number;
  hard: number;
  routine: number;
  new: number;
}

export default function StreakBadge({ streaks }: { streaks: StreakData }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.badge}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={styles.badgeText}>↗ {streaks.total} days</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          <Text style={styles.ddRow}>Total: {streaks.total} days</Text>
          <Text style={[styles.ddRow, { color: '#FF6B6B' }]}>
            🔥 Hard: {streaks.hard} days
          </Text>
          <Text style={[styles.ddRow, { color: '#4ECDC4' }]}>
            🔄 Routine: {streaks.routine} days
          </Text>
          <Text style={[styles.ddRow, { color: '#45B7D1' }]}>
            ✨ New: {streaks.new} days
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
  },
  badge: {
    backgroundColor: '#E6F7F1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2AA87E',
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    width: 200,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  ddRow: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
});
