/**
 * OfflineBanner — Neo-Brutal Skeu Glass offline indicator.
 *
 * Slides in from the top via Animated.timing when offline.
 * Glass background: BlurView + bg tint.
 * Hard ink border on all sides (brutal).
 * No hardcoded colors — everything from theme tokens.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../theme/ThemeContext';

interface Props { visible: boolean }

export const OfflineBanner: React.FC<Props> = ({ visible }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -80,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          borderColor: c.ink,
          borderRadius: tokens.radius.card,
        },
      ]}
      pointerEvents="none"
    >
      {/* Glass background */}
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={theme.mode === 'light' ? 'light' : 'dark'}
        blurAmount={tokens.glass.blurAmount}
        reducedTransparencyFallbackColor={c.surface}
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity }]}
      />

      {/* Content */}
      <View style={styles.row}>
        <Text style={styles.icon}>📡</Text>
        <Text style={[styles.label, { color: c.text }]}>You're offline</Text>
        <Text style={[styles.sub, { color: c.muted }]}>Questions will be queued</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 999,
    borderWidth: 3,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  icon:  { fontSize: 18 },
  label: { fontWeight: '700', fontSize: 14 },
  sub:   { fontSize: 12 },
});

export default OfflineBanner;
