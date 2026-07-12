/**
 * SplashScreen — Neo-Brutal Skeu Glass splash.
 *
 * Animated entrance: logo scales in with spring overshoot (mirrors Kotlin
 * OvershootInterpolator), tagline fades up, three pulsing dots.
 * After 1100 ms navigates to Home.
 *
 * Zero hardcoded colors — all from theme tokens.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, StyleSheet, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { NetworkMonitor } from '../utils/NetworkMonitor';

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  const logoScale   = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textTransY  = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dotAnims = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    NetworkMonitor.start();

    // Logo spring entrance
    Animated.spring(logoScale,   { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Text slide-up + fade
    Animated.parallel([
      Animated.timing(textTransY,  { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();

    // Pulsing dots
    const dotAns = dotAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ]),
      ),
    );
    dotAns.forEach(a => a.start());

    // After 1100ms check auth state and route
    const timer = setTimeout(async () => {
      try {
        const { TokenStore } = await import('../api/apiClient');
        const { apiGetMe }   = await import('../api/apiClient');
        const token = await TokenStore.get();
        let authed = false;
        if (token) {
          const me = await apiGetMe();
          authed = !!me;
          if (!me) await TokenStore.clear();
        }
        navigation.reset({ index: 0, routes: [{ name: authed ? 'Home' : 'Login' }] });
      } catch {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }, 1100);

    return () => { clearTimeout(timer); dotAns.forEach(a => a.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Ambient orbs — using theme primary/accent, not hardcoded colors */}
      <View style={[styles.orb, { backgroundColor: c.primary, top: -80, left: -80 }]} />
      <View style={[styles.orb, { backgroundColor: c.accent,  bottom: -60, right: -60 }]} />

      {/* Logo — hard-shadow ghost + skeu gradient */}
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], marginBottom: 36 }}>
        <View style={{ position: 'relative' }}>
          {/* Ghost shadow — ink colored, not hardcoded #000 */}
          <View
            style={{
              position: 'absolute',
              top: tokens.hardShadow.card.dy,
              left: tokens.hardShadow.card.dx,
              right: -tokens.hardShadow.card.dx,
              bottom: -tokens.hardShadow.card.dy,
              backgroundColor: c.ink,
              borderRadius: 24,
            }}
          />
          <LinearGradient
            colors={[c.primary, c.secondary]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 24,
              borderWidth: tokens.borderWidth.card,
              borderColor: c.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={styles.logoText}>📊</Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Brand text + dots */}
      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTransY }],
          alignItems: 'center',
        }}
      >
        <Text style={[styles.brand, { color: c.text }]}>DiagramQA</Text>
        <Text style={[styles.tagline, { color: c.muted }]}>Ask questions about any diagram</Text>

        <View style={styles.dotsRow}>
          {dotAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { backgroundColor: c.primary, opacity: anim }]}
            />
          ))}
        </View>
        <Text style={[styles.loadingText, { color: c.muted }]}>Loading…</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orb:         { position: 'absolute', width: 240, height: 240, borderRadius: 120, opacity: 0.15 },
  logoText:    { fontSize: 46 },
  brand:       { fontSize: 32, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  tagline:     { fontSize: 14, marginBottom: 36 },
  dotsRow:     { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dot:         { width: 10, height: 10, borderRadius: 5 },
  loadingText: { fontSize: 12 },
});

export default SplashScreen;
