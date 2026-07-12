/**
 * Centralised haptic feedback — mirrors HapticUtil.kt.
 * Reads haptics preference from PreferencesManager so the user's setting is
 * respected exactly as in the Kotlin version.
 */
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { PreferencesManager } from './PreferencesManager';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

async function ifHapticsEnabled(fn: () => void) {
  const enabled = await PreferencesManager.getHapticsEnabled();
  if (enabled) fn();
}

export const HapticUtil = {
  /** Light tap — used for regular button presses. */
  light() {
    ifHapticsEnabled(() =>
      ReactNativeHapticFeedback.trigger('impactLight', options),
    );
  },

  /** Confirm — used for success/confirm actions. */
  confirm() {
    ifHapticsEnabled(() =>
      ReactNativeHapticFeedback.trigger('notificationSuccess', options),
    );
  },

  /** Reject — used for destructive actions / long-press delete. */
  reject() {
    ifHapticsEnabled(() =>
      ReactNativeHapticFeedback.trigger('notificationError', options),
    );
  },

  /** Tick — short pulse, used for toggle switches. */
  tick() {
    ifHapticsEnabled(() =>
      ReactNativeHapticFeedback.trigger('impactMedium', options),
    );
  },
};
