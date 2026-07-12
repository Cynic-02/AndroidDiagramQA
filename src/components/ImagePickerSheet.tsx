/**
 * ImagePickerSheet — Neo-Brutal Skeu Glass bottom sheet.
 *
 * Two-step flow:
 *  Step 1: Camera / Gallery image selection
 *  Step 2: Bloom level picker + question count + MCQ toggle
 *
 * Calls onConfirm(uri, bloomLevel, questionCount, mcqOnly) when ready.
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet,
  TouchableWithoutFeedback, TouchableOpacity,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import {
  launchCamera, launchImageLibrary, type ImagePickerResponse,
} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Button } from './ui/Button';
import { HapticUtil } from '../utils/HapticUtil';
import { BLOOM_LEVELS, BLOOM_EMOJIS, type BloomLevel } from '../types/models';

interface Props {
  visible:   boolean;
  onDismiss: () => void;
  onConfirm: (uri: string, bloom: BloomLevel, questionCount: number, mcqOnly: boolean) => void;
}

type Step = 'pick' | 'bloom';

export const ImagePickerSheet: React.FC<Props> = ({ visible, onDismiss, onConfirm }) => {
  const { theme } = useTheme();
  const c = theme.colors;

  const [step,          setStep]          = useState<Step>('pick');
  const [pickedUri,     setPickedUri]     = useState<string>('');
  const [bloomLevel,    setBloomLevel]    = useState<BloomLevel>('Understand');
  const [questionCount, setQuestionCount] = useState(4);
  const [mcqOnly,       setMcqOnly]       = useState(false);

  function reset() {
    setStep('pick');
    setPickedUri('');
    setBloomLevel('Understand');
    setQuestionCount(4);
    setMcqOnly(false);
  }

  function handleDismiss() { reset(); onDismiss(); }

  function handleResult(resp: ImagePickerResponse) {
    if (resp.didCancel || resp.errorCode) return;
    const uri = resp.assets?.[0]?.uri;
    if (uri) { setPickedUri(uri); setStep('bloom'); }
  }

  async function openCamera() {
    HapticUtil.light();
    handleResult(await launchCamera({ mediaType: 'photo', saveToPhotos: false }));
  }

  async function openGallery() {
    HapticUtil.light();
    handleResult(await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }));
  }

  function handleConfirm() {
    HapticUtil.confirm();
    onConfirm(pickedUri, bloomLevel, questionCount, mcqOnly);
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={[s.backdrop, { backgroundColor: c.ink + '88' }]} />
      </TouchableWithoutFeedback>

      <View style={[s.sheet, { borderColor: c.ink }]}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'light' ? 'light' : 'dark'}
          blurAmount={tokens.glass.blurAmount}
          reducedTransparencyFallbackColor={c.surface}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: tokens.glass.cardFillOpacity }]} />
        <View style={[s.topBorder, { backgroundColor: c.ink }]} />

        <View style={s.content}>
          <View style={[s.handle, { backgroundColor: c.muted }]} />

          {/* ── Step 1: Pick image ── */}
          {step === 'pick' && (
            <>
              <Text style={[s.title, { color: c.text }]}>Add Diagram</Text>
              <Text style={[s.subtitle, { color: c.muted }]}>Pick an image to generate AI questions</Text>
              <Button title="📷  Camera"  onPress={openCamera}  style={s.fullBtn} />
              <View style={{ height: 10 }} />
              <Button title="🖼️  Gallery" onPress={openGallery} style={s.fullBtn} />
              <Pressable style={s.cancelBtn} onPress={handleDismiss}>
                <Text style={[s.cancelText, { color: c.muted }]}>Cancel</Text>
              </Pressable>
            </>
          )}

          {/* ── Step 2: Bloom level ── */}
          {step === 'bloom' && (
            <>
              <Text style={[s.title, { color: c.text }]}>Choose Difficulty</Text>
              <Text style={[s.subtitle, { color: c.muted }]}>Select Bloom's taxonomy level for questions</Text>

              {/* Bloom pills */}
              <View style={s.bloomGrid}>
                {BLOOM_LEVELS.map(level => {
                  const active = level === bloomLevel;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[s.bloomPill, {
                        borderColor: active ? c.primary : c.secondary,
                        backgroundColor: active ? c.primary + '22' : c.bg,
                        overflow: 'hidden',
                      }]}
                      onPress={() => setBloomLevel(level)}
                      activeOpacity={0.8}>
                      {active && (
                        <LinearGradient
                          colors={[c.primary, c.accent]}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        />
                      )}
                      <Text style={s.bloomEmoji}>{BLOOM_EMOJIS[level]}</Text>
                      <Text style={[s.bloomLabel, { color: active ? c.surface : c.text }]}>{level}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Question count */}
              <View style={s.countRow}>
                <Text style={[s.countLabel, { color: c.text }]}>Questions:</Text>
                {[2, 4, 6, 8, 10].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[s.countPill, {
                      borderColor: questionCount === n ? c.primary : c.secondary,
                      backgroundColor: questionCount === n ? c.primary : c.bg,
                    }]}
                    onPress={() => setQuestionCount(n)}>
                    <Text style={[s.countPillText, { color: questionCount === n ? c.surface : c.text }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* MCQ toggle */}
              <TouchableOpacity
                style={[s.mcqRow, { borderColor: mcqOnly ? c.accent : c.secondary }]}
                onPress={() => setMcqOnly(v => !v)}
                activeOpacity={0.8}>
                <View style={[s.mcqCheckbox, {
                  backgroundColor: mcqOnly ? c.accent : c.bg,
                  borderColor: mcqOnly ? c.accent : c.secondary,
                }]}>
                  {mcqOnly && <Text style={{ color: c.surface, fontSize: 11 }}>✓</Text>}
                </View>
                <Text style={[s.mcqLabel, { color: c.text }]}>Multiple Choice Questions only</Text>
              </TouchableOpacity>

              <View style={{ height: 14 }} />
              <Button title="Generate Questions →" onPress={handleConfirm} style={s.fullBtn} />
              <TouchableOpacity style={s.backBtn} onPress={() => setStep('pick')}>
                <Text style={[s.backText, { color: c.muted }]}>← Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop:   { flex: 1 },
  sheet: {
    borderTopWidth: 4, borderLeftWidth: 4, borderRightWidth: 4,
    borderTopLeftRadius: tokens.radius.card + 4,
    borderTopRightRadius: tokens.radius.card + 4,
    overflow: 'hidden',
  },
  topBorder:  { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  content:    { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36 },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title:      { fontFamily: 'Inter-Bold', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  subtitle:   { fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 20 },
  fullBtn:    { width: '100%' },
  cancelBtn:  { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontFamily: 'Inter-Medium', fontSize: 15 },
  bloomGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  bloomPill:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5,
  },
  bloomEmoji: { fontSize: 16 },
  bloomLabel: { fontFamily: 'Inter-Bold', fontSize: 13, fontWeight: '700' },
  countRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  countLabel: { fontFamily: 'Inter-Medium', fontSize: 14 },
  countPill:  { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  countPillText: { fontFamily: 'Inter-Bold', fontSize: 14, fontWeight: '700' },
  mcqRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5 },
  mcqCheckbox:{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mcqLabel:   { fontFamily: 'Inter-Regular', fontSize: 13, flex: 1 },
  backBtn:    { alignItems: 'center', paddingTop: 12 },
  backText:   { fontFamily: 'Inter-Regular', fontSize: 14 },
});

export default ImagePickerSheet;
