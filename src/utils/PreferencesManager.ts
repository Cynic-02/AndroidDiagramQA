/**
 * Persistent app preferences backed by AsyncStorage.
 * Mirrors PreferencesManager.kt exactly:
 *   dark_mode: 0 = follow system, 1 = on, 2 = off
 *   animations_enabled: boolean (default true)
 *   haptics_enabled: boolean (default true)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DARK_MODE_SYSTEM = 0;
export const DARK_MODE_ON = 1;
export const DARK_MODE_OFF = 2;

const KEYS = {
  DARK_MODE: 'dark_mode',
  ANIMATIONS: 'animations_enabled',
  HAPTICS: 'haptics_enabled',
};

export const PreferencesManager = {
  async getDarkMode(): Promise<number> {
    const v = await AsyncStorage.getItem(KEYS.DARK_MODE);
    return v !== null ? parseInt(v, 10) : DARK_MODE_SYSTEM;
  },
  async setDarkMode(mode: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.DARK_MODE, String(mode));
  },

  async getAnimationsEnabled(): Promise<boolean> {
    const v = await AsyncStorage.getItem(KEYS.ANIMATIONS);
    return v !== null ? v === 'true' : true;
  },
  async setAnimationsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.ANIMATIONS, String(enabled));
  },

  async getHapticsEnabled(): Promise<boolean> {
    const v = await AsyncStorage.getItem(KEYS.HAPTICS);
    return v !== null ? v === 'true' : true;
  },
  async setHapticsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.HAPTICS, String(enabled));
  },
};
