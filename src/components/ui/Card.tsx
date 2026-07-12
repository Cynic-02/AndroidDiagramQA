/**
 * Card — Neo-Brutal Skeu Glass card.
 *
 * Three mandatory layers (bottom → top):
 *   1. Brutal: solid-ink ghost View offset 10px down-right (hard unblurred shadow).
 *   2. Glass:  BlurView (native real backdrop blur) + 35% bg-tinted overlay.
 *   3. Content: children rendered on top, un-blurred.
 *
 * The border (4px, ink-colored) wraps layers 2+3.
 * No elevation, no shadowOpacity, no shadowRadius — those produce soft shadows.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../../theme/ThemeContext';
import { ShadowGhost } from './ShadowGhost';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({ children, style, padding = 26 }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;
  const { dx, dy } = tokens.hardShadow.card;

  return (
    <View style={[{ position: 'relative' }, style]}>
      {/* Layer 1 — Brutal hard shadow ghost */}
      <ShadowGhost dx={dx} dy={dy} radius={tokens.radius.card} color={c.ink} />

      {/* Layers 2+3 — Glass card body with border */}
      <View
        style={{
          borderWidth: tokens.borderWidth.card,
          borderColor: c.ink,
          borderRadius: tokens.radius.card,
          overflow: 'hidden',   // clips BlurView to the rounded corners
          padding,
        }}
      >
        {/* Layer 2a — Real native backdrop blur (NOT a flat translucent rectangle) */}
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'light' ? 'light' : 'dark'}
          blurAmount={tokens.glass.blurAmount}
          reducedTransparencyFallbackColor={c.surface}
        />

        {/* Layer 2b — Tint overlay: bg color at 35% opacity on top of the blur */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity },
          ]}
        />

        {/* Layer 3 — Actual children, un-blurred */}
        <View>{children}</View>
      </View>
    </View>
  );
};

export default Card;
