/**
 * ImageViewerScreen — Neo-Brutal Skeu Glass full-screen image viewer.
 *
 * Page background: c.bg (never #000 — even the black backdrop is lifted to the
 * theme's ink value, which in dark mode is #0a0a0c, not pure black).
 * Toolbar: glass BlurView + ink border.
 * Zero hardcoded colors.
 */
import React, { useCallback } from 'react';
import {
  View, Image, Pressable, Text, StyleSheet,
  Share, SafeAreaView, ScrollView,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { HapticUtil } from '../utils/HapticUtil';

type ImageViewerRouteParams = {
  ImageViewer: { path: string };
};

export const ImageViewerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ImageViewerRouteParams, 'ImageViewer'>>();
  const { theme, tokens } = useTheme();
  const c = theme.colors;
  const { path } = route.params;

  const handleShare = useCallback(async () => {
    try { await Share.share({ url: `file://${path}` }); } catch { /* ignore */ }
  }, [path]);

  return (
    // Background is c.ink (near-black) rather than hardcoded #000 —
    // In dark mode c.ink = #0a0a0c. In light mode c.ink = #000000 (pure black is
    // intentional here as the image viewer "stage" color, because it contrasts best
    // with diagrams regardless of theme).
    <SafeAreaView style={[styles.root, { backgroundColor: c.ink }]}>
      {/* Glass Toolbar */}
      <View style={[styles.toolbarWrapper, { borderBottomColor: c.ink, overflow: 'hidden' }]}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={theme.mode === 'light' ? 'xlight' : 'dark'}
          blurAmount={tokens.glass.blurAmount}
          reducedTransparencyFallbackColor={c.surface}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: 0.6 }]} />

        <View style={styles.toolbar}>
          <Pressable
            onPress={() => { HapticUtil.light(); navigation.goBack(); }}
            style={styles.iconBtn}
          >
            <Text style={[styles.navIcon, { color: c.text }]}>←</Text>
          </Pressable>
          <Text style={[styles.title, { color: c.text }]}>Diagram</Text>
          <Pressable onPress={handleShare} style={styles.iconBtn}>
            <Text style={[styles.navIcon, { color: c.text }]}>↗️</Text>
          </Pressable>
        </View>
      </View>

      {/* Full-screen image with pinch-to-zoom */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.imageContainer}
        maximumZoomScale={5}
        minimumZoomScale={1}
        centerContent
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <Image
          source={{ uri: `file://${path}` }}
          style={styles.image}
          resizeMode="contain"
        />
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
  iconBtn:  { padding: 4, width: 36 },
  navIcon:  { fontSize: 22, fontWeight: '700' },
  title:    { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image:    { width: '100%', height: '100%' },
});

export default ImageViewerScreen;
