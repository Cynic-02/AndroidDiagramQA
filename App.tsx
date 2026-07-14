/**
 * DiagramQA — React Native port
 * Neo-Brutal Skeu Glass theme
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';
import { getDb } from './src/db/database';
import { NetworkMonitor } from './src/utils/NetworkMonitor';

/**
 * Initialises the SQLite database and the network monitor at app startup.
 * Mirrors DiagramQAApp.onCreate() in the Kotlin app.
 */
function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Start network monitor
    NetworkMonitor.start();

    // Open (and migrate) the SQLite database
    getDb()
      .then(() => setReady(true))
      .catch((e: any) => setError(e?.message ?? 'DB init failed'));

    return () => NetworkMonitor.stop();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
        <Text style={{ color: theme.colors.text, fontSize: 14 }}>
          Failed to initialise database:{'\n'}{error}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />
    );
  }

  return <>{children}</>;
}

function StatusBarController() {
  const { theme } = useTheme();
  return <StatusBar barStyle={theme.mode === 'light' ? 'dark-content' : 'light-content'} />;
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBarController />
          <AppBootstrap>
            <AppNavigator />
          </AppBootstrap>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
