import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TIERS = [
  { tokens: 10, price: '$2.99', per: '$0.30/token', badge: null },
  { tokens: 25, price: '$4.99', per: '$0.20/token', badge: 'BEST VALUE' },
  { tokens: 60, price: '$9.99', per: '$0.17/token', badge: null },
];

export default function TokenPurchaseModal({
  visible,
  tokens,
  onClose,
}: {
  visible: boolean;
  tokens: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.topRow}>
            <Text style={styles.title}>Get Tokens</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#7A7A7A" />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Current balance</Text>
            <Text style={styles.balanceValue}>🪙 {tokens}</Text>
          </View>

          <Text style={styles.body}>
            Tokens power the Dive Deeper AI analysis. Each deep insight costs 1 token.
          </Text>
          <Text style={styles.freeNote}>
            You receive 5 free tokens every month automatically.
          </Text>

          {TIERS.map((tier) => (
            <TouchableOpacity key={tier.tokens} style={styles.tier} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <View style={styles.tierTitleRow}>
                  <Text style={styles.tierTokens}>{tier.tokens} tokens</Text>
                  {tier.badge && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>{tier.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tierPer}>{tier.per}</Text>
              </View>
              <Text style={styles.tierPrice}>{tier.price}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.footer}>
            Secure payments powered by Stripe. Tokens never expire.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F57F17',
  },
  body: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 8,
  },
  freeNote: {
    fontSize: 13,
    color: '#2AA87E',
    fontWeight: '500',
    marginBottom: 20,
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDEDEB',
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierTokens: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bestBadge: {
    backgroundColor: '#E6F7F1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2AA87E',
    letterSpacing: 0.5,
  },
  tierPer: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 2,
  },
  tierPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  footer: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 8,
  },
});
