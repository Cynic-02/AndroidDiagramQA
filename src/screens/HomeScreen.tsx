/**
 * HomeScreen — Neo-Brutal Skeu Glass home.
 *
 * Full design treatment:
 *  - Toolbar: glass blurred surface header, ink border-bottom
 *  - Status dot: theme-aware green (accent) / red (accent of a danger palette derived
 *    from the design doc's accent red for light mode, muted for offline)
 *  - FAB: skeu gradient + ghost shadow, Animated.spring scale on scroll
 *  - Empty state: full Glass Card with icon badge
 *  - Sessions: SessionCard (glass + ghost shadow + skeu badge)
 *  - OfflineBanner: glass + animated slide
 *
 * Zero hardcoded colors.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, RefreshControl, Animated, SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSessions } from '../hooks/useSessions';
import { SessionCard } from '../components/SessionCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { ImagePickerSheet } from '../components/ImagePickerSheet';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { IconBadge } from '../components/ui/IconBadge';
import { HapticUtil } from '../utils/HapticUtil';
import { Session } from '../types/models';
import DiagramRepository from '../repository/DiagramRepository';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  const {
    sessions, isOnline, toast, loading,
    deleteSession, syncPending, dismissToast, refresh,
  } = useSessions();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fabScale = useRef(new Animated.Value(1)).current;

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(s =>
      s.title.toLowerCase().includes(query) ||
      (s.bloomLevel && s.bloomLevel.toLowerCase().includes(query))
    );
  }, [sessions, searchQuery]);
  const lastScrollY = useRef(0);

  // Toast — must be in useEffect to avoid side effects during render
  useEffect(() => {
    if (toast) {
      Alert.alert('', toast, [{ text: 'OK', onPress: dismissToast }]);
    }
  }, [toast, dismissToast]);

  // Refresh sessions whenever screen comes into focus (e.g. returning from Pipeline or Results)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refresh();
    });
    return unsubscribe;
  }, [navigation, refresh]);

  // FAB shrink/extend on scroll
  const fabVisible = useRef(true);
  const handleScroll = (e: any) => {
    const y  = e.nativeEvent.contentOffset.y;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;
    if (dy > 5 && fabVisible.current) {
      fabVisible.current = false;
      Animated.spring(fabScale, { toValue: 0, useNativeDriver: true }).start();
    } else if (dy < -5 && !fabVisible.current) {
      fabVisible.current = true;
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncPending();
    await refresh();
    setRefreshing(false);
  }, [syncPending, refresh]);

  const handleImagePicked = useCallback(async (uri: string, bloomLevel: import('../types/models').BloomLevel, questionCount: number, mcqOnly: boolean) => {
    const title = `Session ${Date.now() % 100000}`;
    const result = await DiagramRepository.createSession(title, uri, bloomLevel, questionCount, mcqOnly);
    if (result.type === 'success') {
      const session = result.data;
      navigation.navigate('Pipeline', {
        sessionId: session.id,
        runId:     session.runId ?? '',
      });
    } else if (result.type === 'error') {
      Alert.alert('Error', result.message);
    } else {
      Alert.alert('Offline', 'You need an internet connection to generate questions.');
    }
  }, [navigation]);

  const confirmDelete = useCallback((session: Session) => {
    HapticUtil.reject();
    Alert.alert(
      'Delete session?',
      'This will permanently remove the session and all its messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSession(session) },
      ],
    );
  }, [deleteSession]);

  const openSession = useCallback((session: Session) => {
    if (session.runId && session.status === 'running') {
      navigation.navigate('Pipeline', { sessionId: session.id, runId: session.runId });
    } else if (session.qaCount > 0) {
      navigation.navigate('Results', { sessionId: session.id });
    } else {
      navigation.navigate('QnA', {
        sessionId:    session.id,
        sessionTitle: session.title,
        // diagramPath may be '' for remote-only sessions — QnAScreen shows placeholder
        diagramPath:  session.diagramPath ?? '',
      });
    }
  }, [navigation]);

  // ── Status colors — from tokens.statusColors (the only deliberate non-palette hex) ─────
  const onlineColor  = tokens.statusColors.online;   // semantic green, same in both modes
  const offlineColor = tokens.statusColors.offline;  // semantic red, same in both modes

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      {/* ── Toolbar ── */}
      <View style={[styles.toolbarWrapper, { overflow: 'hidden', borderBottomColor: c.ink }]}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'light' ? 'light' : 'dark'}
          blurAmount={tokens.glass.blurAmount}
          reducedTransparencyFallbackColor={c.surface}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity }]} />
        <View style={styles.toolbar}>
          <Text style={[styles.appTitle, { color: c.text }]}>DiagramQA</Text>
          <View style={styles.toolbarRight}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? onlineColor : offlineColor }]} />
            <Text style={[styles.statusText, { color: c.muted }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Pressable
              onPress={() => { HapticUtil.light(); navigation.navigate('Settings'); }}
              style={styles.iconBtn}
            >
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Offline banner */}
      <OfflineBanner visible={!isOnline} />

      {/* Search Bar */}
      {sessions.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ position: 'relative' }}>
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
              placeholder="Search sessions by title or bloom level..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ paddingRight: searchQuery ? 40 : 12 }}
            />
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 10,
                  padding: 4,
                }}
              >
                <Text style={{ fontSize: 16, color: c.muted, fontWeight: 'bold' }}>×</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {/* Session list */}
      <FlatList
        data={filteredSessions}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          loading ? null : sessions.length === 0 ? (
            <View style={{ marginHorizontal: 16, marginTop: 60 }}>
              <Card padding={32}>
                <View style={styles.emptyInner}>
                  <IconBadge><Text style={styles.emptyIcon}>📋</Text></IconBadge>
                  <Text style={[styles.emptyTitle, { color: c.text }]}>No sessions yet</Text>
                  <Text style={[styles.emptySubtitle, { color: c.muted }]}>
                    Tap + to upload a diagram and start asking questions
                  </Text>
                  <Button
                    title="+ New Session"
                    onPress={() => { HapticUtil.light(); setPickerVisible(true); }}
                    style={{ marginTop: 8, alignSelf: 'stretch' }}
                  />
                </View>
              </Card>
            </View>
          ) : (
            <View style={{ marginHorizontal: 16, marginTop: 60 }}>
              <Card padding={24}>
                <View style={styles.emptyInner}>
                  <Text style={{ fontSize: 28 }}>🔍</Text>
                  <Text style={[styles.emptyTitle, { color: c.text }]}>No matches found</Text>
                  <Text style={[styles.emptySubtitle, { color: c.muted, textAlign: 'center' }]}>
                    Try adjusting your keywords or clear the search query.
                  </Text>
                </View>
              </Card>
            </View>
          )
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => openSession(item)}
            onLongPress={() => confirmDelete(item)}
          />
        )}
      />

      {/* FAB — skeu gradient + ghost shadow */}
      <Animated.View style={[styles.fabWrapper, { transform: [{ scale: fabScale }] }]}>
        {/* Ghost shadow */}
        <View
          style={{
            position: 'absolute',
            top: tokens.hardShadow.button.dy,
            left: tokens.hardShadow.button.dx,
            right: -tokens.hardShadow.button.dx,
            bottom: -tokens.hardShadow.button.dy,
            backgroundColor: c.ink,
            borderRadius: 30,
          }}
        />
        <Pressable
          onPress={() => { HapticUtil.light(); setPickerVisible(true); }}
          style={{ position: 'relative', borderRadius: 30, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={[c.primary, c.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fab, { borderColor: c.ink }]}
          >
            <Text style={[styles.fabIcon, { color: c.surface }]}>+</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <ImagePickerSheet
        visible={pickerVisible}
        onDismiss={() => setPickerVisible(false)}
        onConfirm={handleImagePicked}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbarWrapper: {
    borderBottomWidth: 3,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  appTitle:     { fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:    { width: 10, height: 10, borderRadius: 5 },
  statusText:   { fontSize: 12 },
  iconBtn:      { padding: 4 },
  emptyInner:   { alignItems: 'center', gap: 14 },
  emptyIcon:    { fontSize: 28 },
  emptyTitle:   { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptySubtitle:{ fontSize: 13, textAlign: 'center' },
  fabWrapper:   { position: 'absolute', bottom: 28, right: 24 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: { fontSize: 28, fontWeight: '900' },
});

export default HomeScreen;
