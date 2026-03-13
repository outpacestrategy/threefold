import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getUserProfile, getChatMessages, saveChatMessages } from '../lib/storage';
import { UserProfile, ChatMessage } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'OPENAI_API_KEY_PLACEHOLDER';

function buildSystemPrompt(profile: UserProfile): string {
  return `You are a personal accountability coach. The user's name is ${profile.name}, their identity is "${profile.identityStatement}". Their focus areas are ${profile.focusAreas.join(', ')}. Tone: ${profile.aiTone}. Help them set meaningful goals, reflect on their day, and stay consistent with their lifestyle intentions. Keep responses short — 2-3 sentences max.`;
}

export default function CoachScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getUserProfile();
        setProfile(p);
        const msgs = await getChatMessages();
        setMessages(msgs as ChatMessage[]);
      })();
    }, [])
  );

  const sendMessage = async () => {
    if (!input.trim() || !profile) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setSending(true);

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
      <View style={styles.header}>
        <Text style={styles.heading}>AI Coach</Text>
        <Text style={styles.subheading}>Your accountability partner</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatTitle}>Start a conversation</Text>
            <Text style={styles.emptyChatDesc}>
              Ask for help picking goals, reflect on your day, or get a pep talk.
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask your coach..."
            placeholderTextColor="#A0A0A0"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            editable={!sending}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDEB',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subheading: {
    fontSize: 14,
    color: '#7A7A7A',
    marginTop: 2,
  },
  messageList: {
    padding: 24,
    paddingBottom: 16,
    flexGrow: 1,
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
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyChatDesc: {
    fontSize: 15,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
  },
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
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
