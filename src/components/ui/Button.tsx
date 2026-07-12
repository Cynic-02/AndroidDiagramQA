/**
 * Button — Neo-Brutal Skeu Glass button.
 *
 * Three visual layers:
 *   1. Brutal: hard ink ghost shadow (5px at rest, 2px when pressed).
 *      The whole button body also shifts +3px on press to "meet" the
 *      shrinking shadow — never use elevation/shadowOpacity for this.
 *   2. Skeu:   diagonal LinearGradient from `primary` to `accent`, faking
 *      a glossy curved plastic surface.
 *   3. Content: bold text, white in light mode, ink-colored in dark mode.
 *
 * The border is always 3px, ink-colored.
 */
import React, { useState } from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  /** Override gradient colors. Defaults to [primary, accent]. */
  colors?: [string, string];
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  colors,
}) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;
  const [pressed, setPressed] = useState(false);

  const shadow = pressed ? tokens.hardShadow.buttonPressed : tokens.hardShadow.button;
  const shift = pressed ? tokens.pressTranslate : 0;

  const gradientColors: [string, string] = colors ?? [c.primary, c.accent];

  return (
    <Pressable
      onPressIn={() => { if (!disabled) setPressed(true); }}
      onPressOut={() => setPressed(false)}
      onPress={!disabled ? onPress : undefined}
      style={[{ position: 'relative' }, style]}
    >
      {/* Layer 1 — Brutal hard shadow ghost (shrinks on press) */}
      <View
        style={{
          position: 'absolute',
          top: shadow.dy,
          left: shadow.dx,
          right: -shadow.dx,
          bottom: -shadow.dy,
          backgroundColor: c.ink,
          borderRadius: tokens.radius.button,
          opacity: disabled ? 0.4 : 1,
        }}
      />

      {/* Layer 2+3 — Skeu gradient body + text (shifts on press) */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderWidth: tokens.borderWidth.button,
          borderColor: c.ink,
          borderRadius: tokens.radius.button,
          paddingVertical: 10,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: shift }, { translateY: shift }],
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            // White text in light mode (readable over near-black primary/accent),
            // ink-colored text in dark mode (readable over gold/accent gradients).
            color: theme.mode === 'light' ? c.surface : c.ink,
            fontWeight: '800',
            fontSize: 15,
          }}
        >
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
};

export default Button;
