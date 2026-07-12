/**
 * TypingIndicator — three pulsing dots while the AI is generating an answer.
 *
 * Housed in a glass mini-card (BlurView + tint + ink border).
 * Dots are theme.colors.primary (gold in dark, near-black in light).
 * No hardcoded colors.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../theme/ThemeContext';

interface Props { visible: boolean }

export const TypingIndicator: React.FC<Props> = ({ visible }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  const anims = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    if (!visible) return;
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(anim, { toValue: 1,   duration: 420, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 420, useNativeDriver: true }),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Glass mini-card wrapper */}
      <View
        style={[
          styles.bubble,
          { borderColor: c.ink, borderRadius: tokens.radius.card, overflow: 'hidden' },
        ]}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'light' ? 'light' : 'dark'}
          blurAmount={tokens.glass.blurAmount}
          reducedTransparencyFallbackColor={c.surface}
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity }]}
        />
        <View style={styles.dots}>
          {anims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { backgroundColor: c.primary, opacity: anim }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  bubble: {
    borderWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default TypingIndicator;
