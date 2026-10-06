import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';

import { Draft, DraftPhoto, MAX_PHOTOS, SECTION_PROMPTS } from '../../model/types';
import { deletePhoto, photoExists, photoFile, pickPhotos } from '../../photos/photos';
import { getDraft, saveDraft } from '../../storage/drafts';
import { COLOR_THEMES } from '../../templates/themes';
import { Button, Card, Field, Label, colors, fonts, styles } from '../../ui/kit';

const SAVE_DELAY_MS = 400;

export default function EditDraftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState<Draft | null>(() => getDraft(id));
  const [showPrompts, setShowPrompts] = useState(false);
  const [picking, setPicking] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(draft);

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (latest.current) saveDraft(latest.current);
  }, []);

  // Autosave: debounce while typing, and always save when leaving the screen.
  useEffect(() => flush, [flush]);
  useFocusEffect(useCallback(() => flush, [flush]));

  function update(change: (d: Draft) => Draft) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...change(prev), updatedAt: Date.now() };
      latest.current = next;
      return next;
    });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  if (!draft) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <Text style={styles.subtitle}>This draft no longer exists.</Text>
      </View>
    );
  }

  async function addPhotos() {
    if (!draft) return;
    setPicking(true);
    try {
      const added = await pickPhotos(draft.id, MAX_PHOTOS - draft.photos.length);
      if (added.length) update((d) => ({ ...d, photos: [...d.photos, ...added] }));
    } catch (e) {
      Alert.alert('Could not add photos', String(e));
    } finally {
      setPicking(false);
    }
  }

  function removePhoto(photo: DraftPhoto) {
    deletePhoto(draft!.id, photo);
    update((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== photo.id) }));
  }

  function movePhotoEarlier(index: number) {
    if (index === 0) return;
    update((d) => {
      const photos = [...d.photos];
      [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]];
      return { ...d, photos };
    });
  }

  function addSection(heading: string) {
    update((d) => ({ ...d, sections: [...d.sections, { id: randomUUID(), heading, body: '' }] }));
    setShowPrompts(false);
  }

  function updateSection(sectionId: string, patch: { heading?: string; body?: string }) {
    update((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }));
  }

  function removeSection(sectionId: string) {
    update((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== sectionId) }));
  }

  function preview() {
    flush();
    router.push({ pathname: '/preview/[id]', params: { id: draft!.id } });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Card>
        <Label>Title</Label>
        <Field
          value={draft.title}
          onChangeText={(title) => update((d) => ({ ...d, title }))}
          placeholder="The Smith Family — Fall 2026"
        />
        <View style={{ height: 12 }} />
        <Label>Subtitle</Label>
        <Field value={draft.subtitle} onChangeText={(subtitle) => update((d) => ({ ...d, subtitle }))} />
      </Card>

      <Card>
        <Label>Color theme</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {COLOR_THEMES.map((theme) => {
            const selected = theme.name === draft.themeName;
            return (
              <Pressable
                key={theme.name}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={theme.name}
                onPress={() => update((d) => ({ ...d, themeName: theme.name }))}
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: theme.headerBg,
                  borderWidth: selected ? 3 : 2,
                  borderColor: selected ? theme.titleColor : theme.cardBorder,
                }}
              />
            );
          })}
        </View>
        <Text style={[styles.subtitle, { marginTop: 8 }]}>{draft.themeName}</Text>
      </Card>

      {draft.sections.map((section) => (
        <Card key={section.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Section</Label>
            {draft.sections.length > 1 && (
              <Pressable onPress={() => removeSection(section.id)} hitSlop={12}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.danger }}>remove</Text>
              </Pressable>
            )}
          </View>
          <Field
            value={section.heading}
            onChangeText={(heading) => updateSection(section.id, { heading })}
            placeholder="Heading (optional)"
            style={{ fontFamily: fonts.monoBold, fontSize: 14 }}
          />
          <View style={{ height: 8 }} />
          <Field
            value={section.body}
            onChangeText={(body) => updateSection(section.id, { body })}
            placeholder="What's been happening?"
            multiline
          />
        </Card>
      ))}

      <Card>
        <Button title={showPrompts ? 'Close' : '+ Add section'} variant="secondary" onPress={() => setShowPrompts(!showPrompts)} />
        {showPrompts && (
          <View style={{ marginTop: 8, gap: 6 }}>
            {SECTION_PROMPTS.map((prompt) => (
              <Pressable key={prompt} onPress={() => addSection(prompt)} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.title, fontSize: 15 }}>{prompt}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => addSection('')} style={{ paddingVertical: 8 }}>
              <Text style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: 14 }}>Custom heading…</Text>
            </Pressable>
          </View>
        )}
      </Card>

      <Card>
        <Label>
          Photos ({draft.photos.length}/{MAX_PHOTOS})
        </Label>
        <Text style={[styles.subtitle, { marginBottom: 10 }]}>
          The first photo is the header. Then one photo follows each section.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {draft.photos.map((photo, index) => (
            <View key={photo.id} style={{ width: 96 }}>
              {photoExists(draft.id, photo) ? (
                <Image
                  source={{ uri: photoFile(draft.id, photo).uri }}
                  style={{ width: 96, height: 96, borderWidth: 1, borderColor: colors.cardBorder }}
                />
              ) : (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[styles.subtitle, { fontSize: 11, textAlign: 'center' }]}>Re-add{'\n'}photo</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Pressable onPress={() => movePhotoEarlier(index)} disabled={index === 0} hitSlop={8}>
                  <Text style={{ color: index === 0 ? colors.muted : colors.accent, fontSize: 16 }}>◀</Text>
                </Pressable>
                <Pressable onPress={() => removePhoto(photo)} hitSlop={8} accessibilityLabel="Remove photo">
                  <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 12 }} />
        {picking ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Button
            title="+ Add photos"
            variant="secondary"
            onPress={addPhotos}
            disabled={draft.photos.length >= MAX_PHOTOS}
          />
        )}
      </Card>

      <Button title="Preview & share →" onPress={preview} />
    </ScrollView>
  );
}
