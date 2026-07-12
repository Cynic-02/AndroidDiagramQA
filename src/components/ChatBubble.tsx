/**
 * ChatBubble — Neo-Brutal Skeu Glass chat message.
 *
 * Roles:
 *   "user"      → right-aligned, primary→accent gradient fill (skeu), ink border + ghost shadow
 *   "assistant" → left-aligned, glass Card treatment (blur + surface tint), ink border + ghost shadow
 *   "system"    → centered, muted small text, no border/shadow
 *
 * No hardcoded colors — everything from theme.colors + tokens.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../theme/ThemeContext';
import { ShadowGhost } from './ui/ShadowGhost';
import { Message } from '../types/models';
import { TimeFormat } from '../utils/TimeFormat';

interface Props {
  message: Message;
}

export const ChatBubble: React.FC<Props> = ({ message }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;
  const { role, content, timestamp, isPending, errorState } = message;

  if (role === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={[styles.systemText, { color: c.muted }]}>{content}</Text>
      </View>
    );
  }

  const isUser = role === 'user';
  const { dx, dy } = tokens.hardShadow.badge; // 3px shadow for bubbles

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={{ position: 'relative', maxWidth: '82%' }}>
        {/* Brutal hard shadow ghost */}
        <ShadowGhost dx={dx} dy={dy} radius={tokens.radius.card} color={c.ink} />

        {/* Outer border container (clips the inner blur/gradient) */}
        <View
          style={{
            borderWidth: tokens.borderWidth.badge + 1, // 3px
            borderColor: c.ink,
            borderRadius: tokens.radius.card,
            overflow: 'hidden',
          }}
        >
          {isUser ? (
            /* ── User bubble: skeu gradient ── */
            <LinearGradient
              colors={[c.primary, c.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 12 }}
            >
              <Text style={[styles.content, { color: c.surface }]}>{content}</Text>
              <View style={styles.meta}>
                <Text style={[styles.time, { color: c.muted }]}>
                  {TimeFormat.clock(timestamp)}
                </Text>
                {isPending && <Text style={styles.statusIcon}>⏳</Text>}
                {!!errorState && <Text style={styles.statusIcon}>⚠️</Text>}
              </View>
            </LinearGradient>
          ) : (
            /* ── Assistant bubble: glass treatment ── */
            <>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType={theme.mode === 'light' ? 'light' : 'dark'}
                blurAmount={tokens.glass.blurAmount}
                reducedTransparencyFallbackColor={c.surface}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity },
                ]}
              />
              <View style={{ padding: 12 }}>
                <Text style={[styles.content, { color: c.text }]}>{content}</Text>
                <View style={styles.meta}>
                  <Text style={[styles.time, { color: c.muted }]}>
                    {TimeFormat.clock(timestamp)}
                  </Text>
                  {isPending && <Text style={styles.statusIcon}>⏳</Text>}
                  {!!errorState && <Text style={styles.statusIcon}>⚠️</Text>}
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row:        { paddingHorizontal: 12, paddingVertical: 4 },
  rowRight:   { alignItems: 'flex-end' },
  rowLeft:    { alignItems: 'flex-start' },
  systemRow:  { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 24 },
  systemText: { fontSize: 11, fontStyle: 'italic' },
  content:    { fontSize: 14, lineHeight: 20 },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  time:       { fontSize: 10 },
  statusIcon: { fontSize: 10 },
});

export default ChatBubble;
