export const tokens = {
  radius: {
    card: 18,
    badge: 8,
    chip: 10,
    button: 10,
    input: 10,
    pill: 999,
  },
  borderWidth: {
    card: 4,
    badge: 2,
    button: 3,
    input: 3,
    switchTrack: 3,
  },
  hardShadow: {
    // React Native has no "0-blur offset shadow" primitive on Android the way CSS
    // does — fake this with a positioned solid-ink View behind the real element.
    card:          { dx: 10, dy: 10 },
    button:        { dx: 5,  dy: 5  },
    buttonPressed: { dx: 2,  dy: 2  },
    badge:         { dx: 3,  dy: 3  },
    chip:          { dx: 3,  dy: 3  },
  },
  glass: {
    blurAmount:       22,
    blurType:         'light' as 'light' | 'dark' | 'xlight',
    cardFillOpacity:  0.35,
    glowOpacity:      0.45,
    glowRadius:       50,
  },
  /**
   * Semantic status colors — kept out of the theme palettes because they
   * represent a universal signal (green = online, red = offline/error) that
   * must stay recognizable regardless of theme mode.
   * These are the only values intentionally not derived from theme.colors.
   */
  statusColors: {
    online:  '#4caf72',   // desaturated accessible green (AA contrast on both themes)
    offline: '#e63946',   // same red as the light-mode accent — reused for semantic error
  },
  pressTranslate: 3,
  animation: {
    fastMs: 120,
  },
};

