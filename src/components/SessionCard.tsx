/**
 * SessionCard — Neo-Brutal Skeu Glass session list item.
 *
 * Full Neo-Brutal treatment:
 *   • Hard ink ghost shadow (10px) — ShadowGhost, not elevation
 *   • 3px ink border
 *   • Glass background (BlurView + bg tint overlay)
 *   • Skeu gradient badge for message count
 *   • All colors from theme tokens — zero hardcoded values
 */
import React from 'react';
import {
  View, Text, Image, Pressable, StyleSheet,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { ShadowGhost } from './ui/ShadowGhost';
import { Session } from '../types/models';
import { TimeFormat } from '../utils/TimeFormat';

interface Props {
  session: Session;
  onPress: () => void;
  onLongPress: () => void;
}

export const SessionCard: React.FC<Props> = ({ session, onPress, onLongPress }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;
  const { dx, dy } = tokens.hardShadow.card;

  return (
    <View style={{ position: 'relative', marginBottom: 20 }}>
      {/* Brutal hard shadow ghost */}
      <ShadowGhost dx={dx} dy={dy} radius={tokens.radius.card} color={c.ink} />

      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
        style={({ pressed }) => ({
          borderWidth: tokens.borderWidth.card,
          borderColor: c.ink,
          borderRadius: tokens.radius.card,
          overflow: 'hidden',
          transform: pressed
            ? [{ translateX: tokens.pressTranslate }, { translateY: tokens.pressTranslate }]
            : [],
        })}
      >
        {/* Glass background layers */}
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

        {/* Card content (above blur layers) */}
        <View style={styles.content}>
          {/* Diagram thumbnail */}
          <View style={[styles.thumbContainer, { borderColor: c.ink }]}>
            <Image
              source={{ uri: session.diagramPath ? `file://${session.diagramPath}` : undefined }}
              style={styles.thumb}
              resizeMode="cover"
            />
          </View>

          {/* Text block */}
          <View style={styles.body}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {session.title}
            </Text>

            {session.lastQuestion ? (
              <Text style={[styles.preview, { color: c.muted }]} numberOfLines={1}>
                Q: {session.lastQuestion}
              </Text>
            ) : (
              <Text style={[styles.preview, { color: c.muted }]}>No questions yet</Text>
            )}

            <View style={styles.meta}>
              {/* Skeu gradient message count badge */}
              <View style={{ position: 'relative' }}>
                <View
                  style={{
                    position: 'absolute',
                    top: tokens.hardShadow.badge.dy,
                    left: tokens.hardShadow.badge.dx,
                    right: -tokens.hardShadow.badge.dx,
                    bottom: -tokens.hardShadow.badge.dy,
                    backgroundColor: c.ink,
                    borderRadius: tokens.radius.badge,
                  }}
                />
                <LinearGradient
                  colors={[c.primary, c.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderWidth: tokens.borderWidth.badge,
                    borderColor: c.ink,
                    borderRadius: tokens.radius.badge,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={[styles.badgeText, { color: c.surface }]}>
                    {session.qaCount}
                  </Text>
                </LinearGradient>
              </View>

              <Text style={[styles.timestamp, { color: c.muted }]}>
                {TimeFormat.relative(session.updatedAt)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  thumbContainer: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 3,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '800' },
  preview: { fontSize: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  timestamp: { fontSize: 11 },
});

export default SessionCard;
