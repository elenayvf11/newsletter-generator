import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import {
  captureTallPicture,
  capturePictures,
  createPdf,
  emailPictures,
  printDraft,
  shareFile,
  textPictures,
} from '../../export/export';
import { photoExists } from '../../photos/photos';
import { getDraft } from '../../storage/drafts';
import {
  CARD_WIDTH,
  NewsletterCards,
  NewsletterCardsHandle,
  buildCards,
  countImages,
} from '../../templates/NewsletterCards';
import { Button, colors, styles } from '../../ui/kit';

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft] = useState(() => getDraft(id));
  const cards = useMemo(() => (draft ? buildCards(draft) : []), [draft]);
  const [loadedImages, setLoadedImages] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const cardsRef = useRef<NewsletterCardsHandle>(null);

  if (!draft) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <Text style={styles.subtitle}>This draft no longer exists.</Text>
      </View>
    );
  }

  const ready = loadedImages >= countImages(cards) && busy === null;
  const missingPhotos = draft.photos.some((p) => !photoExists(draft.id, p));

  async function run(label: string, task: () => Promise<void>) {
    setBusy(label);
    try {
      await task();
    } catch (e) {
      Alert.alert('Something went wrong', String(e));
    } finally {
      setBusy(null);
    }
  }

  const pictures = () => capturePictures(draft, cardsRef.current?.cards ?? []);
  const tallPicture = () => captureTallPicture(draft, cardsRef.current!.all!);

  const text = () =>
    run('Preparing pictures…', async () => {
      if (!(await textPictures(await pictures()))) {
        Alert.alert('Messages is not available', 'Texting works on an iPhone, not in the Simulator.');
      }
    });

  const email = () =>
    run('Preparing email…', async () => {
      const [files, pdf] = await Promise.all([pictures(), createPdf(draft)]);
      if (!(await emailPictures(draft, files, pdf))) {
        // No Apple Mail account (e.g. Gmail app users): share one tall picture instead.
        await shareFile(await tallPicture());
      }
    });

  const otherApps = () => run('Preparing picture…', async () => shareFile(await tallPicture()));
  const pdf = () => run('Creating PDF…', async () => shareFile(await createPdf(draft)));
  const print = () => run('Opening printer…', () => printDraft(draft));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 12 }}>
        <Text style={[styles.subtitle, { marginBottom: 8, paddingHorizontal: 16, textAlign: 'center' }]}>
          {cards.length === 1
            ? 'This is the picture people will see.'
            : `These ${cards.length} pictures are what people will see.`}
        </Text>
        {missingPhotos && (
          <Text style={[styles.subtitle, { color: colors.danger, paddingHorizontal: 16, marginBottom: 8 }]}>
            Some photos were cleared by iOS to free up space. Re-add them in the editor.
          </Text>
        )}
        <View style={{ width: CARD_WIDTH }}>
          <NewsletterCards
            ref={cardsRef}
            draft={draft}
            cards={cards}
            onImageLoaded={() => setLoadedImages((n) => n + 1)}
          />
        </View>
      </ScrollView>

      <View style={{ padding: 12, paddingBottom: 32, gap: 8, borderTopWidth: 2, borderColor: colors.cardBorder }}>
        {busy ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 12 }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.subtitle}>{busy}</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Text it" onPress={text} disabled={!ready} style={{ flex: 1 }} />
              <Button title="Email it" onPress={email} disabled={!ready} style={{ flex: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Other apps" variant="secondary" onPress={otherApps} disabled={!ready} style={{ flex: 1 }} />
              <Button title="PDF" variant="secondary" onPress={pdf} disabled={!ready} style={{ flex: 1 }} />
              <Button title="Print" variant="secondary" onPress={print} disabled={!ready} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
