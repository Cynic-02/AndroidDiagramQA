import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  ScrollView, TouchableOpacity, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'> };

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const { login, loading, error, clearError } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    clearError();
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    const ok = await login({ email: email.trim(), password });
    if (ok) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Logo ── */}
          <View style={s.logoWrap}>
            <View style={{ position: 'relative' }}>
              <View style={[s.logoShadow, { backgroundColor: c.ink }]} />
              <LinearGradient
                colors={[c.primary, c.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.logoBadge, { borderColor: c.ink }]}>
                <Text style={s.logoEmoji}>📊</Text>
              </LinearGradient>
            </View>
          </View>

          <Text style={[s.title, { color: c.text }]}>DiagramMind</Text>
          <Text style={[s.subtitle, { color: c.muted }]}>Sign in to your account</Text>

          <Text style={[s.fieldLabel, { color: c.text }]}>Email</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            style={s.inputSpacing}
          />

          <Text style={[s.fieldLabel, { color: c.text }]}>Password</Text>
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            style={s.inputSpacing}
          />

          {error ? (
            <Text style={[s.errorText, { color: tokens.statusColors.offline }]}>
              {error}
            </Text>
          ) : null}

          <View style={s.gap} />
          <Button
            title={loading ? 'Signing in…' : 'Sign In'}
            onPress={handleLogin}
            disabled={loading}
            style={s.fullBtn}
          />

          <TouchableOpacity
            style={s.linkWrap}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}>
            <Text style={[s.linkText, { color: c.muted }]}>
              Don't have an account?{' '}
              <Text style={{ color: c.primary, fontWeight: '700' }}>Register</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:       { flex: 1 },
  flex:       { flex: 1 },
  scroll:     { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoWrap:   { alignSelf: 'center', marginBottom: 28 },
  logoShadow: {
    position: 'absolute',
    top: tokens.hardShadow.card.dy,
    left: tokens.hardShadow.card.dx,
    right: -tokens.hardShadow.card.dx,
    bottom: -tokens.hardShadow.card.dy,
    borderRadius: 28,
  },
  logoBadge: {
    width: 90, height: 90, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: tokens.borderWidth.card,
  },
  logoEmoji: { fontSize: 42 },
  title:     { fontFamily: 'Inter-Bold', fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle:  { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center', marginBottom: 28 },
  fieldLabel:{ fontFamily: 'Inter-Medium', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  inputSpacing: { marginBottom: 0 },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, marginTop: 10, textAlign: 'center' },
  gap:       { height: 16 },
  fullBtn:   { width: '100%' },
  linkWrap:  { marginTop: 28, alignItems: 'center' },
  linkText:  { fontFamily: 'Inter-Regular', fontSize: 14 },
});

export default LoginScreen;
