import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts, SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

import { clearExports } from '../export/export';
import { colors, fonts } from '../ui/kit';

export default function RootLayout() {
  const [loaded] = useFonts({ SpaceMono_400Regular, SpaceMono_700Bold });
  // PDFs from earlier sessions aren't needed once they've been shared.
  useEffect(clearExports, []);
  if (!loaded) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.title,
        headerTitleStyle: { fontFamily: fonts.monoBold, fontSize: 16 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Newsletters' }} />
      <Stack.Screen name="draft/[id]" options={{ title: 'Edit' }} />
      <Stack.Screen name="preview/[id]" options={{ title: 'Preview' }} />
    </Stack>
  );
}
