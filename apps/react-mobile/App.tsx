import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { SnackbarHost } from './src/core/components';
import { ThemeProvider, useTheme } from './src/core/theme/ThemeContext';
import { linking, RootNavigator } from './src/navigation/RootNavigator';
import { hydrateStores } from './src/state/hydrate';

/**
 * Root component. Mirrors the Dart port's `main()` awaiting
 * `SharedPreferences.getInstance()` before `runApp()`: every persisted
 * store is hydrated from AsyncStorage before the first real frame, so the
 * orientation bar and next dose are correct immediately with no flash of
 * empty state.
 */
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateStores().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1B5E7A" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.colorScheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
      <SnackbarHost />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
