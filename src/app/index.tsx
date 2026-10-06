import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Draft } from '../model/types';
import { deleteDraft, listDrafts, newDraft } from '../storage/drafts';
import { Button, Card, colors, fonts, styles } from '../ui/kit';

export default function DraftsScreen() {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useFocusEffect(
    useCallback(() => {
      setDrafts(listDrafts());
    }, []),
  );

  function create() {
    const draft = newDraft();
    router.push({ pathname: '/draft/[id]', params: { id: draft.id } });
  }

  function confirmDelete(draft: Draft) {
    Alert.alert('Delete draft?', 'This removes the text and its photos from this app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteDraft(draft.id);
          setDrafts(listDrafts());
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Card>
        <Text style={styles.title}>Very Simple Newsletter Creator</Text>
        <Text style={[styles.subtitle, { marginTop: 4, marginBottom: 16 }]}>
          Your photos stay on this phone. Nothing is uploaded.
        </Text>
        <Button title="+ New newsletter" onPress={create} />
      </Card>

      {drafts.map((draft) => (
        <Pressable
          key={draft.id}
          onPress={() => router.push({ pathname: '/draft/[id]', params: { id: draft.id } })}
          onLongPress={() => confirmDelete(draft)}
          accessibilityHint="Long press to delete"
        >
          <Card>
            <Text style={styles.title} numberOfLines={1}>
              {draft.title.trim() || 'Untitled newsletter'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={styles.subtitle}>
                {draft.photos.length} photo{draft.photos.length === 1 ? '' : 's'} ·{' '}
                {new Date(draft.updatedAt).toLocaleDateString()}
              </Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.cardBorder }}>
                hold to delete
              </Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
