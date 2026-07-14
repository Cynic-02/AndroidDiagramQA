/**
 * SwitchToggle — Neo-Brutal Skeu Glass toggle switch.
 *
 * 42×24 pill track, 3px ink border.
 * Track: primary (on) / semi-transparent surface (off).
 * Knob: 18×18, 2px ink border, accent (on) / secondary (off), slides 2px → 20px.
 *
 * Animated with Animated.spring for smooth thumb slide.
 */
import React, { useRef, useEffect } from 'react';
import { Pressable, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface SwitchToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export const SwitchToggle: React.FC<SwitchToggleProps> = ({ value, onChange }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  // Animate the thumb horizontally: left:2 (off) → left:20 (on)
  const thumbAnim = useRef(new Animated.Value(value ? 20 : 2)).current;

  useEffect(() => {
    Animated.spring(thumbAnim, {
      toValue: value ? 20 : 2,
      tension: 60,
      friction: 8,
      useNativeDriver: false, // marginLeft is a layout prop, can't use native driver
    }).start();
  }, [value, thumbAnim]);

  // Track background: when off, use semi-transparent surface (not rgba(255,255,255,0.1))
  const trackBg = value
    ? c.primary
    : theme.mode === 'light'
      ? 'rgba(253,246,227,0.4)'   // surface-tinted off-state in light mode
      : 'rgba(34,34,37,0.4)';     // surface-tinted off-state in dark mode

  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{
        width: 42,
        height: 24,
        borderRadius: tokens.radius.pill,
        borderWidth: tokens.borderWidth.switchTrack,
        borderColor: c.ink,
        backgroundColor: trackBg,
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: c.ink,
          backgroundColor: value ? c.accent : c.secondary,
          marginLeft: thumbAnim,
        }}
      />
    </Pressable>
  );
};

export default SwitchToggle;
