import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Animated,
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
import type { Session, LocalQuestion, GradeResult } from '../types/models';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Study'>;
  route:      RouteProp<RootStackParamList, 'Study'>;
};

export const StudyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const { theme }     = useTheme();
  const c             = theme.colors;

  const [session,        setSession]        = useState<Session | null>(null);
  const [questions,      setQuestions]      = useState<LocalQuestion[]>([]);
  const [currentIndex,   setCurrentIndex]   = useState(0);
  const [answers,        setAnswers]        = useState<Record<string, string>>({});
  const [gradeResults,   setGradeResults]   = useState<Record<string, GradeResult>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shortText,      setShortText]      = useState('');
  const [grading,        setGrading]        = useState(false);
  const [done,           setDone]           = useState(false);
  const progressAnim                        = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (questions.length === 0) return;
    Animated.timing(progressAnim, {
      toValue:  currentIndex / questions.length,
      duration: 300, useNativeDriver: false,
    }).start();
  }, [currentIndex, questions.length, progressAnim]);

  const currentQ = questions[currentIndex] ?? null;

  const handleMCQOption = useCallback((optIdx: number) => {
    if (!currentQ || selectedOption !== null) return;
    setSelectedOption(optIdx);
    setAnswers(prev => ({ ...prev, [currentQ.id]: String(optIdx) }));
    setTimeout(() => {
      setSelectedOption(null);
      setCurrentIndex(i => {
        const next = i + 1;
        if (next >= questions.length) setDone(true);
        return next < questions.length ? next : i;
      });
    }, 900);
  }, [currentQ, selectedOption, questions.length]);

  const handleSubmitShort = useCallback(async () => {
    if (!currentQ || !shortText.trim() || !session) return;
    setGrading(true);
    const result = await DiagramRepository.gradeAnswer(session, currentQ.id, shortText.trim());
    setGrading(false);
    if (result.type === 'success') {
      setGradeResults(prev => ({ ...prev, [currentQ.id]: result.data }));
      setAnswers(prev => ({ ...prev, [currentQ.id]: shortText.trim() }));
    }
  }, [currentQ, shortText, session]);

  const handleNextShort = useCallback(() => {
    setShortText('');
    setCurrentIndex(i => {
      const next = i + 1;
      if (next >= questions.length) setDone(true);
      return next < questions.length ? next : i;
    });
  }, [questions.length]);

  const handleFinish = useCallback(async () => {
    if (session) {
      const mcqQs  = questions.filter(q => q.type === 'MCQ');
      const correct = mcqQs.filter(q =>
        answers[q.id] !== undefined && q.correctOptionIndex !== null &&
        parseInt(answers[q.id]) === q.correctOptionIndex
      ).length;
      await DiagramRepository.saveAttempt(session, correct, mcqQs.length, answers);
    }
    navigation.goBack();
  }, [session, questions, answers, navigation]);

  const mcqQs    = questions.filter(q => q.type === 'MCQ');
  const correct  = mcqQs.filter(q => answers[q.id] !== undefined && q.correctOptionIndex !== null
    && parseInt(answers[q.id]) === q.correctOptionIndex).length;
  const shortQs  = questions.filter(q => q.type === 'SHORT');
  const avgScore = shortQs.length > 0
    ? Math.round(shortQs.reduce((sum, q) => sum + (gradeResults[q.id]?.score ?? 0), 0) / shortQs.length)
    : null;

  // ── Done / summary ──
  if (done) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={s.summaryScroll}>
          <Text style={s.summaryEmoji}>🎓</Text>
          <Text style={[s.summaryHeading, { color: c.text }]}>Study Complete!</Text>
          {mcqQs.length > 0 && (
            <View style={[s.scoreCard, { backgroundColor: c.surface, borderColor: c.ink }]}>
              <Text style={[s.scoreLabel, { color: c.muted }]}>MCQ Score</Text>
              <Text style={[s.scoreValue, { color: c.primary }]}>{correct} / {mcqQs.length}</Text>
              <View style={[s.barBg, { backgroundColor: c.secondary }]}>
                <View style={[s.barFill, { backgroundColor: c.primary, width: `${mcqQs.length ? (correct / mcqQs.length) * 100 : 0}%` }]} />
              </View>
            </View>
          )}
          {avgScore !== null && (
            <View style={[s.scoreCard, { backgroundColor: c.surface, borderColor: c.ink, marginTop: 12 }]}>
              <Text style={[s.scoreLabel, { color: c.muted }]}>Avg AI Grade</Text>
              <Text style={[s.scoreValue, { color: c.accent }]}>{avgScore} / 100</Text>
            </View>
          )}
          <View style={{ marginTop: 24, width: '100%' }}>
            <Button title="Finish ✓" onPress={handleFinish} style={s.fullBtn} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQ) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
        <View style={s.loadingWrap}>
          <Text style={[s.loadingText, { color: c.muted }]}>Loading study session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const gradeForCurrent = gradeResults[currentQ.id] ?? null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      {/* Toolbar */}
      <BlurView blurType={theme.mode === 'dark' ? 'dark' : 'light'} blurAmount={18} style={s.toolbar}>
        <View style={[s.toolbarInner, { borderBottomColor: c.secondary, borderBottomWidth: 0 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[s.backArrow, { color: c.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[s.toolbarTitle, { color: c.text }]}>Study Mode</Text>
          <Text style={[s.qCount, { color: c.muted }]}>Q {currentIndex + 1} / {questions.length}</Text>
        </View>
        {/* Progress bar */}
        <View style={[s.progressTrack, { backgroundColor: c.secondary }]}>
          <Animated.View style={[s.progressFill, {
            backgroundColor: c.primary,
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]} />
        </View>
      </BlurView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Question card */}
        <View style={{ position: 'relative' }}>
          <View style={[s.cardShadow, { backgroundColor: c.ink }]} />
          <View style={[s.qCard, { backgroundColor: c.surface, borderColor: c.ink }]}>
            {/* Bloom + type chips */}
            <View style={s.chips}>
              <View style={[s.chip, { backgroundColor: c.primary + '22', borderColor: c.primary }]}>
                <Text style={[s.chipText, { color: c.primary }]}>{currentQ.bloomLevel}</Text>
              </View>
              <View style={[s.chip, { backgroundColor: c.secondary + '44', borderColor: c.secondary }]}>
                <Text style={[s.chipText, { color: c.text }]}>{currentQ.type === 'MCQ' ? 'MCQ' : 'Short Answer'}</Text>
              </View>
            </View>
            <Text style={[s.qText, { color: c.text }]}>{currentQ.text}</Text>

            {/* MCQ Options */}
            {currentQ.type === 'MCQ' && currentQ.options && (
              <View style={s.optionsList}>
                {currentQ.options.map((opt, i) => {
                  const isCorrect  = i === currentQ.correctOptionIndex;
                  const isSelected = i === selectedOption;
                  let bg     = c.bg;
                  let border = c.secondary;
                  if (selectedOption !== null) {
                    if (isCorrect)            { bg = tokens.statusColors.online + '22'; border = tokens.statusColors.online; }
                    if (isSelected && !isCorrect) { bg = tokens.statusColors.offline + '22'; border = tokens.statusColors.offline; }
                  }
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[s.optionBtn, { backgroundColor: bg, borderColor: border }]}
                      onPress={() => handleMCQOption(i)}
                      activeOpacity={0.75}
                      disabled={selectedOption !== null}>
                      <LinearGradient
                        colors={isSelected || (selectedOption !== null && isCorrect) ? [c.primary, c.accent] : [c.secondary, c.secondary]}
                        style={s.optionCircle}>
                        <Text style={[s.optionCircleText, {
                          color: isSelected || (selectedOption !== null && isCorrect) ? c.surface : c.muted,
                        }]}>
                          {String.fromCharCode(65 + i)}
                        </Text>
                      </LinearGradient>
                      <Text style={[s.optionText, { color: c.text }]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Short answer */}
            {currentQ.type === 'SHORT' && (
              <View style={s.shortWrap}>
                <TextInput
                  style={[s.shortInput, { backgroundColor: c.bg, borderColor: c.secondary, color: c.text }]}
                  value={shortText}
                  onChangeText={setShortText}
                  placeholder="Type your answer…"
                  placeholderTextColor={c.muted}
                  multiline
                  editable={!gradeForCurrent}
                />
                {!gradeForCurrent && (
                  <View style={{ marginTop: 10 }}>
                    <Button
                      title={grading ? 'Grading…' : 'Submit Answer'}
                      onPress={handleSubmitShort}
                      disabled={grading || !shortText.trim()}
                      style={s.fullBtn}
                    />
                  </View>
                )}
                {gradeForCurrent && (
                  <View style={[s.gradeCard, { backgroundColor: c.bg, borderColor: c.secondary }]}>
                    <View style={s.gradeScoreRow}>
                      <Text style={[s.gradeScoreLabel, { color: c.muted }]}>Score</Text>
                      <Text style={[s.gradeScoreVal, { color: c.primary }]}>{gradeForCurrent.score}/100</Text>
                      {gradeForCurrent.conceptMastery && (
                        <View style={[s.masteryBadge, { backgroundColor: tokens.statusColors.online }]}>
                          <Text style={[s.masteryText, { color: c.surface }]}>Mastered ✓</Text>
                        </View>
                      )}
                    </View>
                    <View style={[s.barBg, { backgroundColor: c.secondary }]}>
                      <View style={[s.barFill, {
                        backgroundColor: gradeForCurrent.score >= 70 ? tokens.statusColors.online : c.accent,
                        width: `${gradeForCurrent.score}%`,
                      }]} />
                    </View>
                    <Text style={[s.gradeFeedback, { color: c.text }]}>{gradeForCurrent.feedback}</Text>
                    <Text style={[s.gradeTip, { color: c.muted }]}>💡 {gradeForCurrent.studyTip}</Text>
                    <View style={{ marginTop: 10 }}>
                      <Button title="Next →" onPress={handleNextShort} style={s.fullBtn} />
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:         { flex: 1 },
  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:  { fontFamily: 'Inter-Regular', fontSize: 15 },
  toolbar:      { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  toolbarInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 6 },
  backArrow:    { fontSize: 22, fontWeight: '700', marginRight: 4 },
  toolbarTitle: { flex: 1, fontFamily: 'Inter-Bold', fontSize: 17, fontWeight: '700' },
  qCount:       { fontFamily: 'Inter-Regular', fontSize: 13 },
  progressTrack:{ height: 4 },
  progressFill: { height: 4 },
  scroll:       { paddingTop: 120, paddingHorizontal: 16, paddingBottom: 40 },
  cardShadow:   {
    position: 'absolute', top: tokens.hardShadow.card.dy, left: tokens.hardShadow.card.dx,
    right: -tokens.hardShadow.card.dx, bottom: -tokens.hardShadow.card.dy,
    borderRadius: tokens.radius.card,
  },
  qCard:        { padding: 18, borderRadius: tokens.radius.card, borderWidth: tokens.borderWidth.card, gap: 14 },
  chips:        { flexDirection: 'row', gap: 8 },
  chip:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5 },
  chipText:     { fontFamily: 'Inter-Bold', fontSize: 12, fontWeight: '700' },
  qText:        { fontFamily: 'Inter-Medium', fontSize: 15, lineHeight: 24 },
  optionsList:  { gap: 10 },
  optionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5 },
  optionCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionCircleText: { fontFamily: 'Inter-Bold', fontSize: 12, fontWeight: '700' },
  optionText:   { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13 },
  shortWrap:    { gap: 0 },
  shortInput:   { borderWidth: 1.5, borderRadius: 10, padding: 12, fontFamily: 'Inter-Regular', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  gradeCard:    { marginTop: 12, padding: 14, borderRadius: 10, borderWidth: 1.5, gap: 8 },
  gradeScoreRow:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  gradeScoreLabel: { fontFamily: 'Inter-Regular', fontSize: 12 },
  gradeScoreVal:{ fontFamily: 'Inter-Bold', fontSize: 22, fontWeight: '800' },
  masteryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  masteryText:  { fontFamily: 'Inter-Bold', fontSize: 11, fontWeight: '700' },
  barBg:        { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: 6, borderRadius: 3 },
  gradeFeedback:{ fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20 },
  gradeTip:     { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18 },
  summaryScroll:{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  summaryEmoji: { fontSize: 60, textAlign: 'center' },
  summaryHeading: { fontFamily: 'Inter-Bold', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  scoreCard:    { width: '100%', padding: 16, borderRadius: tokens.radius.card, borderWidth: tokens.borderWidth.card, gap: 8 },
  scoreLabel:   { fontFamily: 'Inter-Regular', fontSize: 13 },
  scoreValue:   { fontFamily: 'Inter-Bold', fontSize: 32, fontWeight: '800' },
  fullBtn:      { width: '100%' },
});

export default StudyScreen;
