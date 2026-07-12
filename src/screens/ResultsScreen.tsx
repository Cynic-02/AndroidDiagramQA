import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Share,
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
import type { Session, LocalQuestion } from '../types/models';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Results'>;
  route:      RouteProp<RootStackParamList, 'Results'>;
};

export const ResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const { theme }     = useTheme();
  const c             = theme.colors;

  const [session,    setSession]    = useState<Session | null>(null);
  const [questions,  setQuestions]  = useState<LocalQuestion[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, qs] = await Promise.all([
        DiagramRepository.getSession(sessionId),
        DiagramRepository.getQuestions(sessionId),
      ]);
      setSession(s);
      setQuestions(qs);
    })();
  }, [sessionId]);

  const handleShare = useCallback(async () => {
    const text = JSON.stringify(
      questions.map(q => ({ question: q.text, answer: q.answer, type: q.type, bloom: q.bloomLevel })),
      null, 2
    );
    await Share.share({ message: text, title: 'DiagramMind Q&A Export' });
  }, [questions]);

  const renderQuestion = ({ item, index }: { item: LocalQuestion; index: number }) => {
    const isExpanded = expandedId === item.id;
    const isPass     = item.verificationVerdict?.toUpperCase() === 'PASS';

    return (
      <View style={s.cardWrap}>
        <View style={{ position: 'relative' }}>
          {/* Hard shadow */}
          <View style={[s.cardShadow, { backgroundColor: c.ink }]} />
          {/* Card */}
          <View style={[s.qCard, { backgroundColor: c.surface, borderColor: c.ink }]}>
            {/* Header */}
            <View style={s.qHeader}>
              <LinearGradient colors={[c.primary, c.accent]} style={s.qNumBadge}>
                <Text style={[s.qNum, { color: c.surface }]}>{index + 1}</Text>
              </LinearGradient>
              <View style={[s.typePill, { backgroundColor: c.secondary + '44', borderColor: c.secondary }]}>
                <Text style={[s.typePillText, { color: c.text }]}>{item.type === 'MCQ' ? 'MCQ' : 'Short'}</Text>
              </View>
              <View style={[s.bloomPill, { backgroundColor: c.primary + '22', borderColor: c.primary }]}>
                <Text style={[s.bloomPillText, { color: c.primary }]}>{item.bloomLevel}</Text>
              </View>
              <View style={[s.verifyDot, { backgroundColor: isPass ? tokens.statusColors.online : '#f59e0b' }]} />
            </View>

            {/* Question text */}
            <Text style={[s.qText, { color: c.text }]}>{item.text}</Text>

            {/* MCQ options */}
            {item.type === 'MCQ' && item.options && (
              <View style={s.optionsList}>
                {item.options.map((opt, i) => {
                  const isCorrect = i === item.correctOptionIndex;
                  return (
                    <View key={i} style={[s.optionRow, {
                      borderColor: isCorrect ? tokens.statusColors.online : c.secondary,
                      backgroundColor: isCorrect ? tokens.statusColors.online + '22' : c.bg,
                    }]}>
                      <Text style={[s.optionText, { color: isCorrect ? tokens.statusColors.online : c.text }]}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* SHORT answer toggle */}
            {item.type === 'SHORT' && (
              <>
                <TouchableOpacity
                  style={[s.showAnswerBtn, { borderColor: c.primary }]}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.8}>
                  <Text style={[s.showAnswerText, { color: c.primary }]}>
                    {isExpanded ? 'Hide Answer ▲' : 'Show Answer ▼'}
                  </Text>
                </TouchableOpacity>
                {isExpanded && (
                  <View style={[s.answerBox, { backgroundColor: c.bg, borderColor: c.secondary }]}>
                    <Text style={[s.answerText, { color: c.text }]}>{item.answer}</Text>
                    {item.explanation ? (
                      <Text style={[s.explanText, { color: c.muted }]}>{item.explanation}</Text>
                    ) : null}
                  </View>
                )}
              </>
            )}
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[s.backArrow, { color: c.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[s.toolbarTitle, { color: c.text }]}>Results</Text>
          {session?.bloomLevel && (
            <View style={[s.bloomChip, { backgroundColor: c.primary + '22', borderColor: c.primary }]}>
              <Text style={[s.bloomChipText, { color: c.primary }]}>{session.bloomLevel}</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleShare} style={{ marginLeft: 8 }}>
            <Text style={[s.shareIcon, { color: c.primary }]}>↗</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={renderQuestion}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.summaryWrap}>
            <View style={{ position: 'relative' }}>
              <View style={[s.summaryCardShadow, { backgroundColor: c.ink }]} />
              <LinearGradient
                colors={[c.primary, c.accent]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[s.summaryCard, { borderColor: c.ink }]}>
                <Text style={[s.summaryTitle, { color: c.surface }]}>{questions.length} Questions Generated</Text>
                <Text style={[s.summaryBloom, { color: c.surface }]}>Bloom Level: {session?.bloomLevel ?? '—'}</Text>
              </LinearGradient>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[s.emptyCard, { backgroundColor: c.surface, borderColor: c.ink }]}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={[s.emptyText, { color: c.muted }]}>No questions yet — pipeline may still be running.</Text>
          </View>
        }
        ListFooterComponent={
          questions.length > 0 ? (
            <View style={s.footer}>
              <Button title="Start Study Mode 🎓" onPress={() => navigation.navigate('Study', { sessionId })} style={s.footerBtn} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:             { flex: 1 },
  toolbar:          { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  toolbarInner:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12 },
  backArrow:        { fontSize: 22, fontWeight: '700', marginRight: 4 },
  toolbarTitle:     { flex: 1, fontFamily: 'Inter-Bold', fontSize: 17, fontWeight: '700' },
  bloomChip:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5 },
  bloomChipText:    { fontFamily: 'Inter-Bold', fontSize: 12, fontWeight: '700' },
  shareIcon:        { fontSize: 18, fontWeight: '700' },
  list:             { paddingTop: 112, paddingHorizontal: 16, paddingBottom: 40 },
  summaryWrap:      { marginBottom: 18 },
  summaryCardShadow:{
    position: 'absolute', top: tokens.hardShadow.card.dy, left: tokens.hardShadow.card.dx,
    right: -tokens.hardShadow.card.dx, bottom: -tokens.hardShadow.card.dy,
    borderRadius: tokens.radius.card,
  },
  summaryCard:      { padding: 18, borderRadius: tokens.radius.card, borderWidth: tokens.borderWidth.card, gap: 4 },
  summaryTitle:     { fontFamily: 'Inter-Bold', fontSize: 18, fontWeight: '800' },
  summaryBloom:     { fontFamily: 'Inter-Regular', fontSize: 13, opacity: 0.85 },
  cardWrap:         { marginBottom: 16 },
  cardShadow:       {
    position: 'absolute', top: tokens.hardShadow.card.dy, left: tokens.hardShadow.card.dx,
    right: -tokens.hardShadow.card.dx, bottom: -tokens.hardShadow.card.dy,
    borderRadius: tokens.radius.card,
  },
  qCard:            { padding: 14, borderRadius: tokens.radius.card, borderWidth: tokens.borderWidth.card, gap: 10 },
  qHeader:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qNumBadge:        { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  qNum:             { fontFamily: 'Inter-Bold', fontSize: 12, fontWeight: '700' },
  typePill:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1.5 },
  typePillText:     { fontFamily: 'Inter-Bold', fontSize: 11, fontWeight: '700' },
  bloomPill:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1.5 },
  bloomPillText:    { fontFamily: 'Inter-Bold', fontSize: 11, fontWeight: '700' },
  verifyDot:        { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
  qText:            { fontFamily: 'Inter-Medium', fontSize: 14, lineHeight: 22 },
  optionsList:      { gap: 6 },
  optionRow:        { padding: 10, borderRadius: 8, borderWidth: 1.5 },
  optionText:       { fontFamily: 'Inter-Regular', fontSize: 13 },
  showAnswerBtn:    { padding: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  showAnswerText:   { fontFamily: 'Inter-Bold', fontSize: 13, fontWeight: '700' },
  answerBox:        { padding: 12, borderRadius: 8, borderWidth: 1, gap: 6 },
  answerText:       { fontFamily: 'Inter-Medium', fontSize: 13, lineHeight: 20 },
  explanText:       { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18, opacity: 0.75 },
  emptyCard:        { alignItems: 'center', padding: 32, gap: 12, borderRadius: tokens.radius.card, borderWidth: tokens.borderWidth.card },
  emptyIcon:        { fontSize: 40 },
  emptyText:        { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center' },
  footer:           { marginTop: 8 },
  footerBtn:        { width: '100%' },
});

export default ResultsScreen;
