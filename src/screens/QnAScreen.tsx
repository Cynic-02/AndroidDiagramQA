/**
 * QnAScreen — Neo-Brutal Skeu Glass chat screen.
 *
 * Full design treatment:
 *  - Glass blurred toolbar (BlurView + bg tint + ink border)
 *  - Diagram thumbnail: hard shadow + ink border
 *  - Chat list: ChatBubble (skeu user / glass assistant)
 *  - TypingIndicator: glass mini-card
 *  - Input bar: glass background, Input component
 *  - Send button: skeu gradient + ghost shadow
 *  - OfflineBanner: glass animated slide
 *
 * Zero hardcoded colors.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, SafeAreaView, KeyboardAvoidingView, Platform,
  Image, Share,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useChat } from '../hooks/useChat';
import { ChatBubble } from '../components/ChatBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { OfflineBanner } from '../components/OfflineBanner';
import { ImagePickerSheet } from '../components/ImagePickerSheet';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { IconBadge } from '../components/ui/IconBadge';
import { Input } from '../components/ui/Input';
import { HapticUtil } from '../utils/HapticUtil';
import DiagramRepository from '../repository/DiagramRepository';

type QnARouteParams = {
  QnA: { sessionId: string; sessionTitle: string; diagramPath: string };
};

export const QnAScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<QnARouteParams, 'QnA'>>();
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  const {
    session, messages, isOnline, sending,
    toast, syncedToast,
    loadSession, newSession, ask, clearChat,
    dismissToast, dismissSyncedToast,
  } = useChat();

  const [input, setInput] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (route.params?.sessionId) loadSession(route.params.sessionId);
  }, [route.params?.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  if (toast) Alert.alert('', toast, [{ text: 'OK', onPress: dismissToast }]);
  if (syncedToast) Alert.alert('Synced', 'Queued questions have been sent.', [{ text: 'OK', onPress: dismissSyncedToast }]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    if (!session) { Alert.alert('', 'Pick a diagram first'); return; }
    HapticUtil.light();
    setInput('');
    await ask(text);
  }, [input, session, ask]);

  const handleImagePicked = useCallback(async (uri: string, bloomLevel: import('../types/models').BloomLevel, questionCount: number, mcqOnly: boolean) => {
    const title = `Session ${Date.now() % 100000}`;
    const result = await DiagramRepository.createSession(title, uri, bloomLevel, questionCount, mcqOnly);
    if (result.type === 'success') {
      (navigation as any).navigate('Pipeline', { sessionId: result.data.id, runId: result.data.runId ?? '' });
    } else if (result.type === 'error') {
      Alert.alert('Error', result.message);
    }
  }, [navigation]);

  const confirmClear = useCallback(() => {
    Alert.alert('Clear chat?', 'All messages will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearChat },
    ]);
  }, [clearChat]);

  const shareSession = useCallback(async () => {
    if (!session) return;
    try { await Share.share({ url: `file://${session.diagramPath}` }); } catch { /* ignore */ }
  }, [session]);

  const diagramPath  = session?.diagramPath ?? route.params?.diagramPath;
  const sessionTitle = session?.title ?? route.params?.sessionTitle ?? 'Q&A';

  // Status colors — from tokens.statusColors (semantic; same in both modes)
  const onlineColor  = tokens.statusColors.online;
  const offlineColor = tokens.statusColors.offline;

  // ── Empty state ───────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={{ marginHorizontal: 16, marginTop: 40 }}>
      <Card padding={28}>
        <View style={styles.emptyInner}>
          <IconBadge><Text style={{ fontSize: 24 }}>💬</Text></IconBadge>
          <Text style={[styles.emptyTitle, { color: c.text }]}>Ask your first question</Text>
          <Text style={[styles.emptySubtitle, { color: c.muted }]}>
            Type a question about the diagram below and tap Send
          </Text>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      {/* ── Glass Toolbar ── */}
      <View style={[styles.toolbarWrapper, { borderBottomColor: c.ink, overflow: 'hidden' }]}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'light' ? 'light' : 'dark'}
          blurAmount={tokens.glass.blurAmount}
          reducedTransparencyFallbackColor={c.surface}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity }]} />

        <View style={styles.toolbar}>
          <Pressable onPress={() => { HapticUtil.light(); navigation.goBack(); }} style={styles.iconBtn}>
            <Text style={[styles.navIcon, { color: c.text }]}>←</Text>
          </Pressable>

          {/* Diagram thumbnail — ink border + ghost shadow */}
          <Pressable
            onPress={() => diagramPath && navigation.navigate('ImageViewer', { path: diagramPath })}
          >
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  position: 'absolute',
                  top: 2, left: 2, right: -2, bottom: -2,
                  backgroundColor: c.ink,
                  borderRadius: 10,
                }}
              />
              {diagramPath ? (
                <Image
                  source={{ uri: `file://${diagramPath}` }}
                  style={[styles.thumb, { borderColor: c.ink }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumb, { backgroundColor: c.surface, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 18 }}>📊</Text>
                </View>
              )}
            </View>
          </Pressable>

          <Text style={[styles.sessionTitle, { color: c.text }]} numberOfLines={1}>
            {sessionTitle}
          </Text>

          <View style={styles.toolbarRight}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? onlineColor : offlineColor }]} />
            <Pressable onPress={() => setPickerVisible(true)} style={styles.iconBtn}>
              <Text style={{ fontSize: 17 }}>🔄</Text>
            </Pressable>
            <Pressable onPress={confirmClear} style={styles.iconBtn}>
              <Text style={{ fontSize: 17 }}>🗑️</Text>
            </Pressable>
            <Pressable onPress={shareSession} style={styles.iconBtn}>
              <Text style={{ fontSize: 17 }}>↗️</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <OfflineBanner visible={!isOnline} />

      {/* Chat */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => <ChatBubble message={item} />}
        />

        <TypingIndicator visible={sending} />

        {/* ── Glass input bar ── */}
        <View style={[styles.inputBarWrapper, { borderTopColor: c.ink, overflow: 'hidden' }]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={theme.mode === 'light' ? 'light' : 'dark'}
            blurAmount={tokens.glass.blurAmount}
            reducedTransparencyFallbackColor={c.surface}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity }]} />

          <View style={styles.inputBar}>
            <Input
              style={{ flex: 1, maxHeight: 120 }}
              placeholder="Ask a question about the diagram…"
              value={input}
              onChangeText={setInput}
              multiline
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleSend}
            />

            {/* Send button — skeu gradient + ghost shadow */}
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  position: 'absolute',
                  top: tokens.hardShadow.button.dy,
                  left: tokens.hardShadow.button.dx,
                  right: -tokens.hardShadow.button.dx,
                  bottom: -tokens.hardShadow.button.dy,
                  backgroundColor: c.ink,
                  borderRadius: tokens.radius.button,
                  opacity: !input.trim() ? 0.4 : 1,
                }}
              />
              <Pressable
                onPress={handleSend}
                disabled={sending || !input.trim()}
                style={({ pressed }) => ({
                  borderRadius: tokens.radius.button,
                  overflow: 'hidden',
                  transform: pressed
                    ? [{ translateX: tokens.pressTranslate }, { translateY: tokens.pressTranslate }]
                    : [],
                  opacity: !input.trim() ? 0.5 : 1,
                })}
              >
                <LinearGradient
                  colors={[c.primary, c.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderWidth: tokens.borderWidth.button,
                    borderColor: c.ink,
                    borderRadius: tokens.radius.button,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: c.surface, fontWeight: '900' }}>➤</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ImagePickerSheet
        visible={pickerVisible}
        onDismiss={() => setPickerVisible(false)}
        onConfirm={handleImagePicked}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root:            { flex: 1 },
  toolbarWrapper:  { borderBottomWidth: 3 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  iconBtn:      { padding: 4 },
  navIcon:      { fontSize: 22, fontWeight: '700' },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 3,
  },
  sessionTitle: { flex: 1, fontSize: 14, fontWeight: '800' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  emptyInner:   { alignItems: 'center', gap: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySubtitle:{ fontSize: 12, textAlign: 'center' },
  inputBarWrapper: { borderTopWidth: 3 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
});

export default QnAScreen;
