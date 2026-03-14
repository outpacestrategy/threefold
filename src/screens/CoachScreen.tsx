import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserProfile,
  getChatMessages,
  saveChatMessages,
  getTokenBalance,
  spendToken,
} from '../lib/storage';
import { UserProfile, ChatMessage } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'OPENAI_API_KEY_PLACEHOLDER';

const PROMPT_CHIPS = [
  'I keep avoiding my hard goal',
  'Why do I lose momentum?',
  "I'm stuck in a loop",
];

function buildSystemPrompt(profile: UserProfile): string {
  return `You are a personal accountability coach. The user's name is ${profile.name}, their identity is "${profile.identityStatement}". Their focus areas are ${profile.focusAreas.join(', ')}. Tone: ${profile.aiTone}. Help them reflect on patterns, blockers, and intentions. Keep responses short — 2-3 sentences max.`;
}

export default function CoachScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tokens, setTokens] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getUserProfile();
        setProfile(p);
        const msgs = await getChatMessages();
        setMessages(msgs as ChatMessage[]);
        const bal = await getTokenBalance();
        setTokens(bal);
      })();
    }, [])
  );

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || !profile) return;

    if (tokens <= 0) {
      Alert.alert(
        'No tokens remaining',
        'You need tokens to send messages. Complete goals to earn more.',
      );
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setSending(true);

    const newBalance = await spendToken();
    setTokens(newBalance);

    try {
      const systemPrompt = buildSystemPrompt(profile);
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...updated.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: apiMessages,
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const assistantContent =
        data.choices?.[0]?.message?.content || "I'm having trouble connecting. Try again in a moment.";

      const assistantMessage: ChatMessage = { role: 'assistant', content: assistantContent };
      const allMessages = [...updated, assistantMessage];
      setMessages(allMessages);
      await saveChatMessages(allMessages);
    } catch {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "Couldn't reach the AI coach right now. Check your connection and try again.",
      };
      const allMessages = [...updated, errorMessage];
      setMessages(allMessages);
      await saveChatMessages(allMessages);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.role === 'user' ? styles.userText : styles.assistantText,
        ]}
      >
        {item.content}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.heading}>Reflect</Text>
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenText}>🪙 {tokens} tokens</Text>
          </View>
        </View>
        <Text style={styles.subheading}>
          Talk through what's on your mind. Each message uses 1 token.
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.messageListEmpty,
        ]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubble-outline" size={48} color="#C0C0C0" />
            </View>
            <Text style={styles.emptyTitle}>Start a reflection</Text>
            <Text style={styles.emptyDesc}>
              Share what's blocking you, what you're avoiding, or what you're noticing about your patterns.
            </Text>
            <View style={styles.chipRow}>
              {PROMPT_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.chip}
                  onPress={() => sendMessage(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="What's on your mind..."
            placeholderTextColor="#A0A0A0"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage()}
            editable={!sending}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },

  /* Header */
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDEB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tokenBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tokenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F57F17',
  },
  subheading: {
    fontSize: 14,
    color: '#7A7A7A',
    lineHeight: 20,
  },

  /* Messages */
  messageList: {
    padding: 24,
    paddingBottom: 16,
    flexGrow: 1,
  },
  messageListEmpty: {
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#1A1A1A',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#1A1A1A',
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
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
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  chipRow: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },

  /* Input bar */
  inputRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#EDEDEB',
    backgroundColor: '#FAF9F7',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDEDEB',
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
