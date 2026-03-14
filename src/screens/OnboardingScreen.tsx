import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfile, IdentityType, AiTone, FocusArea, TomorrowEntry } from '../types';
import { saveUserProfile, saveTomorrowEntry, getTomorrowDate } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications, scheduleEveningReminder } from '../lib/notifications';

const IDENTITY_TYPES: { value: IdentityType; label: string }[] = [
  { value: 'founder', label: 'Founder' },
  { value: 'athlete', label: 'Athlete' },
  { value: 'builder', label: 'Builder' },
  { value: 'creator', label: 'Creator' },
  { value: 'other', label: 'Other' },
];

const FOCUS_AREAS: { value: FocusArea; label: string }[] = [
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'career', label: 'Career' },
  { value: 'learning', label: 'Learning' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'finance', label: 'Finance' },
];

const AI_TONES: { value: AiTone; label: string; desc: string }[] = [
  { value: 'supportive', label: 'Supportive', desc: 'Warm, encouraging, celebrates wins' },
  { value: 'direct', label: 'Direct', desc: 'No fluff, straight to the point' },
  { value: 'analytical', label: 'Analytical', desc: 'Data-driven, pattern-focused' },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [identityType, setIdentityType] = useState<IdentityType | null>(null);
  const [identityStatement, setIdentityStatement] = useState('');
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [aiTone, setAiTone] = useState<AiTone | null>(null);
  const [hardGoal, setHardGoal] = useState('');
  const [routineGoal, setRoutineGoal] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiModalPrompt, setAiModalPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const AI_PROMPTS: Record<string, string> = {
    identity: `I am [your job or situation]. I want to build better habits because [your reason]. Consistency matters to me because [why it matters right now]. Write this as a short 1-2 sentence personal statement for a goal-tracking app.`,
    name: `I'm setting up a goal-tracking app and need to decide how I want to be addressed. My name is [your name]. Should I use my full name, a nickname, or something else? Just give me a short suggestion.`,
    whyConsistency: `Write an honest 1-2 sentence answer to this question: Why does staying consistent with my daily goals matter to me right now? I am [your situation/job/life stage].`,
  };

  const openAiModal = (promptKey: string) => {
    setAiModalPrompt(AI_PROMPTS[promptKey]);
    setCopied(false);
    setAiModalVisible(true);
  };

  const handleCopyPrompt = async () => {
    await Clipboard.setStringAsync(aiModalPrompt);
    setCopied(true);
  };

  const toggleFocus = (area: FocusArea) => {
    setFocusAreas((prev) => {
      if (prev.includes(area)) return prev.filter((a) => a !== area);
      if (prev.length >= 3) return prev;
      return [...prev, area];
    });
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return name.trim().length > 0 && identityType !== null;
      case 1: return identityStatement.trim().length > 0;
      case 2: return focusAreas.length > 0;
      case 3: return aiTone !== null;
      case 4: return hardGoal.trim().length > 0 && routineGoal.trim().length > 0 && newGoal.trim().length > 0;
      default: return false;
    }
  };

  const handleFinish = async () => {
    const profile: UserProfile = {
      name: name.trim(),
      identityType: identityType!,
      identityStatement: identityStatement.trim(),
      focusAreas,
      aiTone: aiTone!,
      onboardingComplete: true,
    };
    await saveUserProfile(profile);

    // Save profile to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('tf_profiles').upsert({
          id: user.id,
          name: profile.name,
          identity_type: profile.identityType,
          identity_statement: profile.identityStatement,
          focus_areas: profile.focusAreas,
          ai_tone: profile.aiTone,
          onboarding_complete: true,
        });
      }
    } catch {}

    const tomorrow: TomorrowEntry = {
      date: getTomorrowDate(),
      hardGoal: hardGoal.trim(),
      routineGoal: routineGoal.trim(),
      newGoal: newGoal.trim(),
    };
    await saveTomorrowEntry(tomorrow);

    // Set up notifications
    try {
      await registerForPushNotifications();
      await scheduleEveningReminder();
    } catch {}

    onComplete();
  };

  const handleNext = () => {
    if (step === 4) {
      handleFinish();
    } else {
      setStep(step + 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Welcome to Threefold</Text>
            <Text style={styles.stepDesc}>Let's get to know you.</Text>

            <Text style={styles.label}>What's your name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#A0A0A0"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <TouchableOpacity onPress={() => openAiModal('name')}>
              <Text style={styles.askAiLink}>Not sure what to say? Ask AI →</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 24 }]}>I identify as a...</Text>
            <View style={styles.chipRow}>
              {IDENTITY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, identityType === t.value && styles.chipSelected]}
                  onPress={() => setIdentityType(t.value)}
                >
                  <Text style={[styles.chipText, identityType === t.value && styles.chipTextSelected]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Your identity</Text>
            <Text style={styles.stepDesc}>Why does consistency matter to you?</Text>
            <Text style={styles.hint}>
              This becomes your north star. Your AI coach will reference it to keep you aligned.
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="e.g. I'm building the discipline to match my ambition..."
              placeholderTextColor="#A0A0A0"
              value={identityStatement}
              onChangeText={setIdentityStatement}
              multiline
              autoFocus
              blurOnSubmit
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <TouchableOpacity onPress={() => openAiModal('identity')}>
              <Text style={styles.askAiLink}>Not sure what to say? Ask AI →</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Focus areas</Text>
            <Text style={styles.stepDesc}>Pick up to 3 areas you want to grow in.</Text>
            <View style={styles.chipRow}>
              {FOCUS_AREAS.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[
                    styles.chip,
                    focusAreas.includes(a.value) && styles.chipSelected,
                    focusAreas.length >= 3 && !focusAreas.includes(a.value) && styles.chipDisabled,
                  ]}
                  onPress={() => toggleFocus(a.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      focusAreas.includes(a.value) && styles.chipTextSelected,
                    ]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Coaching style</Text>
            <Text style={styles.stepDesc}>How should your AI coach talk to you?</Text>
            {AI_TONES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.toneCard, aiTone === t.value && styles.toneCardSelected]}
                onPress={() => setAiTone(t.value)}
              >
                <Text style={[styles.toneLabel, aiTone === t.value && styles.toneLabelSelected]}>
                  {t.label}
                </Text>
                <Text style={styles.toneDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>Your first three goals</Text>
            <Text style={styles.stepDesc}>Plan tomorrow tonight. What will you tackle?</Text>

            <View style={styles.goalSlot}>
              <View style={[styles.goalDot, { backgroundColor: '#FF6B6B' }]} />
              <View style={styles.goalSlotContent}>
                <Text style={styles.goalSlotLabel}>Hard goal</Text>
                <Text style={styles.goalSlotHint}>Push your limits</Text>
                <TextInput
                  style={styles.goalInput}
                  placeholder="e.g. Run 5 miles without stopping"
                  placeholderTextColor="#A0A0A0"
                  value={hardGoal}
                  onChangeText={setHardGoal}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.goalSlot}>
              <View style={[styles.goalDot, { backgroundColor: '#4ECDC4' }]} />
              <View style={styles.goalSlotContent}>
                <Text style={styles.goalSlotLabel}>Routine goal</Text>
                <Text style={styles.goalSlotHint}>Build consistency</Text>
                <TextInput
                  style={styles.goalInput}
                  placeholder="e.g. Read for 30 minutes"
                  placeholderTextColor="#A0A0A0"
                  value={routineGoal}
                  onChangeText={setRoutineGoal}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.goalSlot}>
              <View style={[styles.goalDot, { backgroundColor: '#45B7D1' }]} />
              <View style={styles.goalSlotContent}>
                <Text style={styles.goalSlotLabel}>New goal</Text>
                <Text style={styles.goalSlotHint}>Try something fresh</Text>
                <TextInput
                  style={styles.goalInput}
                  placeholder="e.g. Cook a new recipe"
                  placeholderTextColor="#A0A0A0"
                  value={newGoal}
                  onChangeText={setNewGoal}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Progress dots */}
          <View style={styles.progress}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.progressDot, i <= step && styles.progressDotActive]}
              />
            ))}
          </View>

          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, !canAdvance() && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canAdvance()}
          >
            <Text style={styles.nextText}>{step === 4 ? "Let's go" : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={aiModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Copy this into ChatGPT or Claude</Text>
            <View style={styles.modalPromptBox}>
              <Text style={styles.modalPromptText}>{aiModalPrompt}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyPrompt}>
              <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy Prompt'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalInstruction}>
              Paste this into any AI, then paste the response back here
            </Text>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setAiModalVisible(false)}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EDEDEB',
  },
  progressDotActive: {
    backgroundColor: '#1A1A1A',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 17,
    color: '#7A7A7A',
    marginBottom: 28,
    lineHeight: 24,
  },
  hint: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  chipSelected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  toneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    padding: 20,
    marginBottom: 12,
  },
  toneCardSelected: {
    borderColor: '#1A1A1A',
    borderWidth: 2,
  },
  toneLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  toneLabelSelected: {
    color: '#1A1A1A',
  },
  toneDesc: {
    fontSize: 14,
    color: '#7A7A7A',
  },
  goalSlot: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  goalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 14,
  },
  goalSlotContent: {
    flex: 1,
  },
  goalSlotLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  goalSlotHint: {
    fontSize: 13,
    color: '#7A7A7A',
    marginTop: 2,
    marginBottom: 10,
  },
  goalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 36,
    backgroundColor: '#FAF9F7',
    borderTopWidth: 1,
    borderTopColor: '#EDEDEB',
    gap: 12,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  askAiLink: {
    fontSize: 13,
    color: '#7A7A7A',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FAF9F7',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalPromptBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    padding: 16,
    marginBottom: 16,
  },
  modalPromptText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 21,
  },
  copyButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalInstruction: {
    fontSize: 13,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissButtonText: {
    fontSize: 15,
    color: '#7A7A7A',
    fontWeight: '500',
  },
});
