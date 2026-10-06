import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';

import { createPdf, draftToHtml, printDraft, sharePdf } from '../../export/export';
import { Draft, PageFormat } from '../../model/types';
import { photoExists } from '../../photos/photos';
import { getDraft, updateDraft } from '../../storage/drafts';
import { Button, colors, fonts, styles } from '../../ui/kit';

// Reports the rendered height (in CSS px at the 595px page width) so the
// "scroll" PDF can be exactly one page tall. Re-sent after images load.
const MEASURE_JS = `
  (function () {
    function send() {
      window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight));
    }
    send();
    window.addEventListener('load', send);
    Array.prototype.forEach.call(document.images, function (img) {
      if (!img.complete) img.addEventListener('load', send);
    });
  })();
  true;
`;

const FORMATS: { value: PageFormat; label: string; hint: string }[] = [
  { value: 'scroll', label: 'One page', hint: 'Best for email: the reader just scrolls.' },
  { value: 'a4', label: 'A4 pages', hint: 'Best for printing.' },
];

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState<Draft | null>(() => getDraft(id));
  const [html, setHtml] = useState<string | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const format = draft?.format ?? 'scroll';

  // Built once per visit; the format only changes how the PDF is paged.
  useEffect(() => {
    let cancelled = false;
    const initial = getDraft(id);
    if (initial) {
      draftToHtml(initial).then((h) => {
        if (!cancelled) setHtml(h);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!draft) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <Text style={styles.subtitle}>This draft no longer exists.</Text>
      </View>
    );
  }

  const missingPhotos = draft.photos.some((p) => !photoExists(draft.id, p));

  function setFormat(value: PageFormat) {
    if (!draft || value === draft.format) return;
    setDraft(updateDraft(draft, { format: value }));
  }

  async function share() {
    if (!draft) return;
    setBusy(true);
    try {
      const file = await createPdf(draft, format, height ?? undefined);
      await sharePdf(file);
    } catch (e) {
      Alert.alert('Could not create the PDF', String(e));
    } finally {
      setBusy(false);
    }
  }

  async function print() {
    if (!draft) return;
    try {
      await printDraft(draft);
    } catch (e) {
      Alert.alert('Could not print', String(e));
    }
  }

  const waitingForHeight = format === 'scroll' && height === null;

  return (
    <View style={styles.screen}>
      <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
        {FORMATS.map((f) => {
          const selected = f.value === format;
          return (
            <Pressable
              key={f.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setFormat(f.value)}
              style={{
                flex: 1,
                padding: 10,
                borderWidth: 2,
                borderColor: selected ? colors.accent : colors.cardBorder,
                backgroundColor: selected ? colors.button : colors.content,
              }}
            >
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 13, color: colors.title }}>{f.label}</Text>
              <Text style={{ fontSize: 11, color: colors.subtitle, marginTop: 2 }}>{f.hint}</Text>
            </Pressable>
          );
        })}
      </View>

      {missingPhotos && (
        <Text style={[styles.subtitle, { paddingHorizontal: 12, color: colors.danger }]}>
          Some photos were cleared by iOS to free up space. Re-add them in the editor.
        </Text>
      )}

      <View style={{ flex: 1, marginHorizontal: 12, borderWidth: 2, borderColor: colors.cardBorder }}>
        {html === null ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            injectedJavaScript={MEASURE_JS}
            onMessage={(e) => {
              const h = Number(e.nativeEvent.data);
              if (Number.isFinite(h) && h > 0) setHeight(h);
            }}
            style={{ backgroundColor: 'transparent' }}
          />
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 32 }}>
        <Button title="Print" variant="secondary" onPress={print} style={{ flex: 1 }} />
        <Button
          title={busy ? 'Creating PDF…' : 'Share PDF'}
          onPress={share}
          disabled={busy || html === null || waitingForHeight}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}
