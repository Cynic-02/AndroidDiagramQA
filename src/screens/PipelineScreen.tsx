import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Button } from '../components/ui/Button';
import DiagramRepository from '../repository/DiagramRepository';
import type { Session, StageId, StageStatus, StageEvent, LogLine } from '../types/models';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Pipeline'>;
  route:      RouteProp<RootStackParamList, 'Pipeline'>;
};

interface StageDef { id: StageId; label: string; icon: string; desc: string }

const STAGE_DEFS: StageDef[] = [
  { id: 'extraction',   label: 'Vision Extraction',     icon: '👁️', desc: 'Parsing diagram structure…' },
  { id: 'generation',   label: 'Question Generation',   icon: '❓', desc: 'Generating Bloom-level questions…' },
  { id: 'answering',    label: 'Independent Answering', icon: '🧠', desc: 'Answering from diagram only…' },
  { id: 'verification', label: 'Verification',          icon: '✅', desc: 'Critic checking Q&A pairs…' },
  { id: 'results',      label: 'Results Ready',         icon: '🌟', desc: 'Curating final question set…' },
];

type StageState = { status: StageStatus; message: string; logs: string[] };

function initStages(): Record<string, StageState> {
  const m: Record<string, StageState> = {};
  STAGE_DEFS.forEach(s => { m[s.id] = { status: 'idle', message: s.desc, logs: [] }; });
  return m;
}

function statusColor(st: StageStatus, primary: string, muted: string): string {
  if (st === 'done')    return tokens.statusColors.online;
  if (st === 'running') return primary;
  if (st === 'error')   return tokens.statusColors.offline;
  if (st === 'flagged') return '#f59e0b';
  return muted;
}

export const PipelineScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const { theme }  = useTheme();
  const c          = theme.colors;

  const [session,  setSession]  = useState<Session | null>(null);
  const [stages,   setStages]   = useState<Record<string, StageState>>(initStages());
  const [done,     setDone]     = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cleanupRef              = useRef<(() => void) | null>(null);

  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const onStage = useCallback((ev: StageEvent) => {
    setStages(prev => ({
      ...prev,
      [ev.stage]: { ...prev[ev.stage], status: ev.status, message: ev.message ?? prev[ev.stage]?.message ?? '' },
    }));
  }, []);

  const onLog = useCallback((log: LogLine) => {
    setStages(prev => {
      const ex = prev[log.stage] ?? { status: 'idle', message: '', logs: [] };
      return { ...prev, [log.stage]: { ...ex, logs: [...ex.logs.slice(-4), log.text] } };
    });
  }, []);

  const onDone  = useCallback(() => setDone(true), []);
  const onError = useCallback((msg: string) => setErrorMsg(msg), []);

  useEffect(() => {
    (async () => {
      const s = await DiagramRepository.getSession(sessionId);
      if (!s) { setErrorMsg('Session not found.'); return; }
      setSession(s);
      cleanupRef.current = DiagramRepository.streamPipeline(s, onStage, onLog, onDone, onError);
    })();
    return () => { cleanupRef.current?.(); };
  }, [sessionId, onStage, onLog, onDone, onError]);

  const renderStage = ({ item }: { item: StageDef }) => {
    const st = stages[item.id] ?? { status: 'idle', message: item.desc, logs: [] };
    const isRunning = st.status === 'running';
    const dotColor  = statusColor(st.status, c.primary, c.muted);

    return (
      <View style={s.stageWrap}>
        <View style={{ position: 'relative' }}>
          {/* Hard shadow */}
          <View style={[s.stageShadow, { backgroundColor: c.ink }]} />
          {/* Card */}
          <View style={[s.stageCard, { backgroundColor: c.surface, borderColor: c.ink }]}>
            <LinearGradient colors={[c.primary, c.accent]} style={s.stageIcon}>
              <Text style={s.stageIconText}>{item.icon}</Text>
            </LinearGradient>
            <View style={s.stageContent}>
              <View style={s.stageHeaderRow}>
                <Text style={[s.stageLabel, { color: c.text }]}>{item.label}</Text>
                <View style={[s.statusDot, { backgroundColor: dotColor }]} />
              </View>
              <Text style={[s.stageDesc, { color: c.muted }]}>{st.message}</Text>
              {isRunning && (
                <View style={s.dotsRow}>
                  {[0, 1, 2].map(i => (
                    <Animated.View key={i} style={[s.dot, { backgroundColor: c.primary, opacity: pulse }]} />
                  ))}
                </View>
              )}
              {st.logs.length > 0 && (
                <View style={s.logsBox}>
                  {st.logs.slice(-2).map((l, i) => (
                    <Text key={i} style={[s.logLine, { color: c.muted }]} numberOfLines={1}>{l}</Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      {/* Toolbar */}
      <BlurView blurType={theme.mode === 'dark' ? 'dark' : 'light'} blurAmount={18} style={s.toolbar}>
        <View style={[s.toolbarInner, { borderBottomColor: c.secondary, borderBottomWidth: 1 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={[s.backArrow, { color: c.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[s.toolbarTitle, { color: c.text }]}>AI Pipeline</Text>
          <View style={[s.onlineDot, { backgroundColor: tokens.statusColors.online }]} />
        </View>
      </BlurView>

      <FlatList
        data={STAGE_DEFS}
        keyExtractor={item => item.id}
        renderItem={renderStage}
        contentContainerStyle={s.list}
        ListFooterComponent={
          done ? (
            <View style={s.footer}>
              <Button title="View Questions →" onPress={() => navigation.replace('Results', { sessionId })} style={s.footerBtn} />
            </View>
          ) : errorMsg ? (
            <View style={s.footer}>
              <View style={[s.errorCard, { backgroundColor: c.surface, borderColor: tokens.statusColors.offline }]}>
                <Text style={[s.errorTitle, { color: tokens.statusColors.offline }]}>Pipeline Error</Text>
                <Text style={[s.errorBody, { color: c.muted }]}>{errorMsg}</Text>
              </View>
              <View style={{ height: 12 }} />
              <Button title="← Go Back" onPress={() => navigation.goBack()} style={s.footerBtn} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:        { flex: 1 },
  toolbar:     { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  toolbarInner:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12 },
  backBtn:     { marginRight: 12 },
  backArrow:   { fontSize: 22, fontWeight: '700' },
  toolbarTitle:{ flex: 1, fontFamily: 'Inter-Bold', fontSize: 17, fontWeight: '700' },
  onlineDot:   { width: 10, height: 10, borderRadius: 5 },
  list:        { paddingTop: 110, paddingHorizontal: 16, paddingBottom: 32 },
  stageWrap:   { marginBottom: 16 },
  stageShadow: {
    position: 'absolute',
    top: tokens.hardShadow.card.dy, left: tokens.hardShadow.card.dx,
    right: -tokens.hardShadow.card.dx, bottom: -tokens.hardShadow.card.dy,
    borderRadius: tokens.radius.card,
  },
  stageCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 14, borderRadius: tokens.radius.card,
    borderWidth: tokens.borderWidth.card,
  },
  stageIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
  },
  stageIconText:  { fontSize: 22 },
  stageContent:   { flex: 1 },
  stageHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stageLabel:     { flex: 1, fontFamily: 'Inter-Bold', fontSize: 14, fontWeight: '700' },
  statusDot:      { width: 9, height: 9, borderRadius: 5 },
  stageDesc:      { fontFamily: 'Inter-Regular', fontSize: 12, marginBottom: 6 },
  dotsRow:        { flexDirection: 'row', gap: 5, marginBottom: 6 },
  dot:            { width: 7, height: 7, borderRadius: 4 },
  logsBox:        { gap: 2 },
  logLine:        { fontFamily: 'monospace', fontSize: 10 },
  footer:         { marginTop: 8 },
  footerBtn:      { width: '100%' },
  errorCard:      { padding: 16, borderRadius: tokens.radius.card, borderWidth: 2, gap: 6 },
  errorTitle:     { fontFamily: 'Inter-Bold', fontSize: 15, fontWeight: '700' },
  errorBody:      { fontFamily: 'Inter-Regular', fontSize: 13 },
});

export default PipelineScreen;
