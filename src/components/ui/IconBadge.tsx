/**
 * IconBadge — Neo-Brutal Skeu Glass icon badge.
 *
 * 46×46 square, 14px radius.
 * Skeu: diagonal gradient primary → secondary (fakes a glossy raised surface).
 * Brutal: 3px ink border + hard 4px ghost shadow.
 */
import React from 'react';
import { View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

export const IconBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ position: 'relative' }}>
      {/* Brutal hard shadow ghost — 4px offset */}
      <View
        style={{
          position: 'absolute',
          top: tokens.hardShadow.badge.dy,
          left: tokens.hardShadow.badge.dx,
          right: -tokens.hardShadow.badge.dx,
          bottom: -tokens.hardShadow.badge.dy,
          backgroundColor: c.ink,
          borderRadius: tokens.radius.badge + 6, // badge radius = 8, icon uses 14 (badge+6)
        }}
      />
      {/* Skeu gradient body */}
      <LinearGradient
        colors={[c.primary, c.secondary]}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 46,
          height: 46,
          borderWidth: tokens.borderWidth.badge + 1, // 3px
          borderColor: c.ink,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

export default IconBadge;
