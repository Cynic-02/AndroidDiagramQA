/**
 * Tag — Neo-Brutal Skeu Glass chip/tag.
 *
 * Solid secondary fill (single-color gradient so the LinearGradient API is uniform),
 * 3px offset ghost shadow, 2px ink border, 8px radius.
 * Text: uppercase, bold, surface-colored (never hardcoded white — uses theme.colors.surface
 * which in light mode is the warm cream #fdf6e3, not #ffffff).
 */
import React from 'react';
import { View, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

export const Tag: React.FC<{ label: string }> = ({ label }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ position: 'relative' }}>
      {/* Brutal hard shadow ghost — 3px offset */}
      <View
        style={{
          position: 'absolute',
          top: tokens.hardShadow.chip.dy,
          left: tokens.hardShadow.chip.dx,
          right: -tokens.hardShadow.chip.dx,
          bottom: -tokens.hardShadow.chip.dy,
          backgroundColor: c.ink,
          borderRadius: tokens.radius.badge,
        }}
      />
      {/* Skeu body — solid secondary (single-stop gradient keeps the API consistent) */}
      <LinearGradient
        colors={[c.secondary, c.secondary]}
        style={{
          borderWidth: tokens.borderWidth.badge,
          borderColor: c.ink,
          borderRadius: tokens.radius.badge,
          paddingVertical: 4,
          paddingHorizontal: 9,
        }}
      >
        <Text
          style={{
            // surface in light mode = warm cream #fdf6e3, NOT pure #ffffff
            color: c.surface,
            fontWeight: '800',
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </View>
  );
};

export default Tag;
