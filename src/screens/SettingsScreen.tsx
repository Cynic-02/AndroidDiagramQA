/**
 * SettingsScreen — Neo-Brutal Skeu Glass settings.
 *
 * Full design treatment:
 *  - Glass blurred toolbar
 *  - Setting rows: glass card background, ink border + ghost shadow
 *  - Toggles: SwitchToggle component (animated, themed)
 *  - Dark mode cycle row: Tag chip for current value
 *  - Destructive action: uses theme.colors.accent (red in light / gold in dark)
 *    rather than hardcoded #ef4444
 *
 * Zero hardcoded colors.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  Alert, SafeAreaView, ScrollView,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import {
  PreferencesManager,
  DARK_MODE_SYSTEM, DARK_MODE_ON, DARK_MODE_OFF,
} from '../utils/PreferencesManager';
import { useTheme } from '../theme/ThemeContext';
import { HapticUtil } from '../utils/HapticUtil';
import { DiagramRepository } from '../repository/DiagramRepository';
import { SwitchToggle } from '../components/ui/SwitchToggle';
import { Tag } from '../components/ui/Tag';
import { Card } from '../components/ui/Card';
import { BASE_URL, getServerUrl, setServerUrl } from '../api/apiClient';
import { Input } from '../components/ui/Input';


function darkModeLabel(mode: number) {
  if (mode === DARK_MODE_ON)  return 'On';
  if (mode === DARK_MODE_OFF) return 'Off';
  return 'System';
}
function nextDarkMode(current: number): number {
  if (current === DARK_MODE_SYSTEM) return DARK_MODE_ON;
  if (current === DARK_MODE_ON)     return DARK_MODE_OFF;
  return DARK_MODE_SYSTEM;
}

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, tokens, setMode } = useTheme();
  const c = theme.colors;

  const [darkMode,          setDarkMode]          = useState(DARK_MODE_SYSTEM);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [hapticsEnabled,    setHapticsEnabled]    = useState(true);
  const [serverUrl,         setServerUrlState]    = useState('');

  useEffect(() => {
    Promise.all([
      PreferencesManager.getDarkMode(),
      PreferencesManager.getAnimationsEnabled(),
      PreferencesManager.getHapticsEnabled(),
      getServerUrl(),
    ]).then(([dm, anim, haptic, url]) => {
      setDarkMode(dm);
      setAnimationsEnabled(anim);
      setHapticsEnabled(haptic);
      setServerUrlState(url);
    });
  }, []);

  const cycleDarkMode = useCallback(async () => {
    HapticUtil.tick();
    const next = nextDarkMode(darkMode);
    setDarkMode(next);
    await PreferencesManager.setDarkMode(next);
    if (next === DARK_MODE_ON)     setMode('dark');
    if (next === DARK_MODE_OFF)    setMode('light');
    if (next === DARK_MODE_SYSTEM) setMode('system');
  }, [darkMode, setMode]);

  const toggleAnimations = useCallback(async () => {
    HapticUtil.tick();
    const next = !animationsEnabled;
    setAnimationsEnabled(next);
    await PreferencesManager.setAnimationsEnabled(next);
  }, [animationsEnabled]);

  const toggleHaptics = useCallback(async () => {
    HapticUtil.tick();
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    await PreferencesManager.setHapticsEnabled(next);
  }, [hapticsEnabled]);
  const handleServerUrlChange = useCallback(async (newUrl: string) => {
    setServerUrlState(newUrl);
    await setServerUrl(newUrl);
  }, []);
  const clearHistory = useCallback(() => {
    HapticUtil.reject();
    Alert.alert(
      'Clear all sessions?',
      'This will permanently delete all sessions and their messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            await DiagramRepository.clearAllSessions();
            Alert.alert('', 'History cleared.');
          },
        },
      ],
    );
  }, []);

  // ── Row components ────────────────────────────────────────────────────────

  const SettingRow = ({
    label,
    right,
    onPress,
    destructive = false,
  }: {
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
    destructive?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: c.ink,
          overflow: 'hidden',
          transform: pressed && onPress
            ? [{ translateX: tokens.pressTranslate }, { translateY: tokens.pressTranslate }]
            : [],
        },
      ]}
    >
      {/* Glass background for each row */}
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={theme.mode === 'light' ? 'light' : 'dark'}
        blurAmount={tokens.glass.blurAmount}
        reducedTransparencyFallbackColor={c.surface}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity }]} />

      <Text
        style={[
          styles.rowLabel,
          {
            // Destructive rows use accent (red #e63946 in light, champagne #f5deb3 in dark)
            // — not hardcoded #ef4444
            color: destructive ? c.accent : c.text,
          },
        ]}
      >
        {label}
      </Text>
      {right && <View>{right}</View>}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Glass Toolbar */}
      <View style={[styles.toolbarWrapper, { borderBottomColor: c.ink, overflow: 'hidden' }]}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'light' ? 'light' : 'dark'}
          blurAmount={tokens.glass.blurAmount}
          reducedTransparencyFallbackColor={c.surface}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity }]} />
        <View style={styles.toolbar}>
          <Pressable onPress={() => { HapticUtil.light(); navigation.goBack(); }} style={[styles.iconBtn, { width: 36 }]}>
            <Text style={[styles.navIcon, { color: c.text }]}>←</Text>
          </Pressable>
          <Text style={[styles.screenTitle, { color: c.text }]}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Appearance ── */}
        <Text style={[styles.sectionHeader, { color: c.muted }]}>APPEARANCE</Text>

        {/* Hard ghost shadow wrapper for dark-mode row */}
        <View style={{ position: 'relative', marginBottom: 10 }}>
          <View
            style={{
              position: 'absolute',
              top: tokens.hardShadow.badge.dy,
              left: tokens.hardShadow.badge.dx,
              right: -tokens.hardShadow.badge.dx,
              bottom: -tokens.hardShadow.badge.dy,
              backgroundColor: c.ink,
              borderRadius: tokens.radius.input,
            }}
          />
          <SettingRow
            label="Dark mode"
            onPress={cycleDarkMode}
            right={<Tag label={darkModeLabel(darkMode)} />}
          />
        </View>

        <View style={{ position: 'relative', marginBottom: 10 }}>
          <View
            style={{
              position: 'absolute',
              top: tokens.hardShadow.badge.dy,
              left: tokens.hardShadow.badge.dx,
              right: -tokens.hardShadow.badge.dx,
              bottom: -tokens.hardShadow.badge.dy,
              backgroundColor: c.ink,
              borderRadius: tokens.radius.input,
            }}
          />
          <SettingRow
            label="Animations"
            onPress={toggleAnimations}
            right={<SwitchToggle value={animationsEnabled} onChange={toggleAnimations} />}
          />
        </View>

        <View style={{ position: 'relative', marginBottom: 10 }}>
          <View
            style={{
              position: 'absolute',
              top: tokens.hardShadow.badge.dy,
              left: tokens.hardShadow.badge.dx,
              right: -tokens.hardShadow.badge.dx,
              bottom: -tokens.hardShadow.badge.dy,
              backgroundColor: c.ink,
              borderRadius: tokens.radius.input,
            }}
          />
          <SettingRow
            label="Haptics"
            onPress={toggleHaptics}
            right={<SwitchToggle value={hapticsEnabled} onChange={toggleHaptics} />}
          />
        </View>

        {/* ── Data ── */}
        <Text style={[styles.sectionHeader, { color: c.muted }]}>DATA</Text>

        <View style={{ position: 'relative', marginBottom: 10 }}>
          <View
            style={{
              position: 'absolute',
              top: tokens.hardShadow.badge.dy,
              left: tokens.hardShadow.badge.dx,
              right: -tokens.hardShadow.badge.dx,
              bottom: -tokens.hardShadow.badge.dy,
              backgroundColor: c.ink,
              borderRadius: tokens.radius.input,
            }}
          />
          <SettingRow
            label="Clear all sessions"
            onPress={clearHistory}
            destructive
          />
        </View>

        {/* ── Backend Server URL ── */}
        <Text style={[styles.sectionHeader, { color: c.muted }]}>BACKEND SERVER</Text>
        <Card padding={16} style={{ marginBottom: 16 }}>
          <Text style={[styles.rowLabel, { color: c.text, marginBottom: 8 }]}>API URL</Text>
          <View style={{ position: 'relative', marginBottom: 8 }}>
            {/* Shadow ghost */}
            <View
              style={{
                position: 'absolute',
                top: tokens.hardShadow.badge.dy,
                left: tokens.hardShadow.badge.dx,
                right: -tokens.hardShadow.badge.dx,
                bottom: -tokens.hardShadow.badge.dy,
                backgroundColor: c.ink,
                borderRadius: tokens.radius.input,
              }}
            />
            <Input
              value={serverUrl}
              onChangeText={handleServerUrlChange}
              placeholder="https://your-app.vercel.app"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>
            Default: {BASE_URL} (Leave empty to reset to default)
          </Text>
        </Card>

        {/* ── About ── */}
        <Text style={[styles.sectionHeader, { color: c.muted }]}>ABOUT</Text>

        <Card padding={16} style={{ marginBottom: 10 }}>
          <View style={styles.aboutRow}>
            <Text style={[styles.rowLabel, { color: c.text }]}>Version</Text>
            <Text style={[styles.rowValue, { color: c.muted }]}>1.0.0</Text>
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root:            { flex: 1 },
  toolbarWrapper:  { borderBottomWidth: 3 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn:     { padding: 4 },
  navIcon:     { fontSize: 22, fontWeight: '700' },
  screenTitle: { flex: 1, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  scroll:      { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 3,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowValue: { fontSize: 13 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

export default SettingsScreen;
