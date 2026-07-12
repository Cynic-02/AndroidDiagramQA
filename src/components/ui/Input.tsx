/**
 * Input — Neo-Brutal Skeu Glass text input.
 *
 * 3px ink border, 10px radius.
 * Background: translucent glass tint —
 *   Light mode: rgba(253,246,227, 0.55) — surface at partial opacity, not rgba(255,255,255,…)
 *   Dark mode:  rgba(34,34,37, 0.55)    — surface at partial opacity
 *
 * Accepts all standard TextInput props via spread.
 */
import React from 'react';
import { TextInput, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({ containerStyle, style, ...rest }) => {
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  // Translucent surface background — using the THEME surface color at partial opacity,
  // never plain rgba(255,255,255,…) which would introduce pure white in light mode.
  const bgColor = theme.mode === 'light'
    ? 'rgba(253,246,227,0.55)'   // surface #fdf6e3 at ~55%
    : 'rgba(34,34,37,0.55)';     // surface #222225 at ~55%

  return (
    <TextInput
      placeholderTextColor={c.muted}
      style={[
        {
          borderWidth: tokens.borderWidth.input,
          borderColor: c.ink,
          borderRadius: tokens.radius.input,
          paddingVertical: 10,
          paddingHorizontal: 12,
          color: c.text,
          backgroundColor: bgColor,
          fontSize: 14,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export default Input;
