/**
 * ShadowGhost — the "brutal" half of Neo-Brutal Skeu Glass.
 *
 * Renders a solid-ink rectangle positioned absolutely, offset by dx/dy,
 * behind the real element. This fakes CSS's `box-shadow: Npx Npx 0 ink`
 * (a hard, unblurred offset shadow) which React Native cannot do natively.
 *
 * Usage:
 *   <View style={{ position: 'relative' }}>
 *     <ShadowGhost dx={10} dy={10} radius={18} color={theme.colors.ink} />
 *     <YourCard />        ← drawn on top of the ghost
 *   </View>
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';

interface ShadowGhostProps {
  dx: number;
  dy: number;
  radius: number;
  color: string;
}

export const ShadowGhost: React.FC<ShadowGhostProps> = ({ dx, dy, radius, color }) => (
  <View
    style={{
      position: 'absolute',
      top: dy,
      left: dx,
      right: -dx,
      bottom: -dy,
      backgroundColor: color,
      borderRadius: radius,
    }}
  />
);

// ─── Legacy alias kept for backwards-compatibility with Button.tsx ─────────
interface StyleSheetAbsoluteProps { style: ViewStyle }
export const StyleSheetAbsolute: React.FC<StyleSheetAbsoluteProps> = ({ style }) => (
  <View style={[{ position: 'absolute', right: 0, bottom: 0 }, style]} />
);

export default ShadowGhost;
