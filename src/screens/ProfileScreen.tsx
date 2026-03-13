import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserProfile,
  saveUserProfile,
  getHistory,
} from '../lib/storage';
import { UserProfile, FocusArea, AiTone, DayEntry } from '../types';

const FOCUS_AREAS: { value: FocusArea; label: string }[] = [
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'career', label: 'Career' },
  { value: 'learning', label: 'Learning' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'finance', label: 'Finance' },
];

const AI_TONES: { value: AiTone; label: string }[] = [
  { value: 'supportive', label: 'Supportive' },
  { value: 'direct', label: 'Direct' },
  { value: 'analytical', label: 'Analytical' },
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [identityStatement, setIdentityStatement] = useState('');
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [aiTone, setAiTone] = useState<AiTone>('supportive');

  const loadData = async () => {
    setLoading(true);
    const p = await getUserProfile();
    const h = await getHistory();
    setProfile(p);
    setHistory(h);
    if (p) {
      setName(p.name);
      setIdentityStatement(p.identityStatement);
      setFocusAreas(p.focusAreas);
      setAiTone(p.aiTone);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
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
      identityStatement: identityStatement.trim(),
      focusAreas,
      aiTone,
    };
    await saveUserProfile(updated);
    setProfile(updated);
    setEditing(false);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear all data?',
      'This will reset your profile, goals, and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setProfile(null);
          },
        },
      ]
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

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No profile found. Complete onboarding to get started.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalDays = history.length;
  const perfectDays = history.filter(
    (d) => d.hardStatus === 'complete' && d.routineStatus === 'complete' && d.newStatus === 'complete'
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalDays}</Text>
            <Text style={styles.statLabel}>Days tracked</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{perfectDays}</Text>
            <Text style={styles.statLabel}>Perfect days</Text>
          </View>
        </View>

        {editing ? (
          <>
            <Text style={styles.sectionTitle}>Edit Profile</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />

            <Text style={styles.fieldLabel}>Identity statement</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={identityStatement}
              onChangeText={setIdentityStatement}
              multiline
            />

            <Text style={styles.fieldLabel}>Focus areas (up to 3)</Text>
            <View style={styles.chipRow}>
              {FOCUS_AREAS.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.chip, focusAreas.includes(a.value) && styles.chipSelected]}
                  onPress={() => toggleFocus(a.value)}
                >
                  <Text style={[styles.chipText, focusAreas.includes(a.value) && styles.chipTextSelected]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>AI coaching tone</Text>
            <View style={styles.chipRow}>
              {AI_TONES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, aiTone === t.value && styles.chipSelected]}
                  onPress={() => setAiTone(t.value)}
                >
                  <Text style={[styles.chipText, aiTone === t.value && styles.chipTextSelected]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileType}>{profile.identityType}</Text>
              <Text style={styles.profileStatement}>"{profile.identityStatement}"</Text>
              <View style={styles.profileMeta}>
                <Text style={styles.metaLabel}>Focus: </Text>
                <Text style={styles.metaValue}>{profile.focusAreas.join(', ')}</Text>
              </View>
              <View style={styles.profileMeta}>
                <Text style={styles.metaLabel}>Coach tone: </Text>
                <Text style={styles.metaValue}>{profile.aiTone}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={handleClearData}>
              <Text style={styles.clearText}>Clear all data</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.version}>threefold v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#7A7A7A', textAlign: 'center' },
  content: { padding: 24, paddingTop: 32, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#EDEDEB' },
  statNumber: { fontSize: 32, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 13, color: '#7A7A7A', marginTop: 4 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#EDEDEB', marginBottom: 16 },
  profileName: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  profileType: { fontSize: 14, color: '#7A7A7A', textTransform: 'capitalize', marginBottom: 12 },
  profileStatement: { fontSize: 15, color: '#555', fontStyle: 'italic', lineHeight: 22, marginBottom: 16 },
  profileMeta: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  metaValue: { fontSize: 14, color: '#7A7A7A', textTransform: 'capitalize' },
  editButton: { backgroundColor: '#1A1A1A', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  editButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  clearButton: { paddingVertical: 16, alignItems: 'center' },
  clearText: { fontSize: 15, color: '#D44', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDEDEB', padding: 14, fontSize: 15, color: '#1A1A1A' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDEDEB' },
  chipSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  chipText: { fontSize: 14, color: '#1A1A1A' },
  chipTextSelected: { color: '#FFFFFF' },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDEDEB', alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  saveButton: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#1A1A1A', alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: '#A0A0A0', fontSize: 12, marginTop: 32 },
});
