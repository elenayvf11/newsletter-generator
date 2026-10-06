import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Draft, DraftPhoto, Section } from '../model/types';
import { photoExists, photoFile } from '../photos/photos';
import { ColorTheme, getTheme } from './themes';

// The newsletter drawn with native views so it can be captured as pictures
// (react-native-view-shot) for texting and for the body of an email. It follows
// the same layout and colors as the PDF template in newsletter.ts.

export const CARD_WIDTH = 390;

type Block = { kind: 'section'; section: Section } | { kind: 'photo'; photo: DraftPhoto };

interface CardSpec {
  header: boolean;
  headerPhoto?: DraftPhoto;
  blocks: Block[];
  footer: boolean;
}

/**
 * Splits a draft into picture-sized cards: the title, header photo and first
 * section; then each later section with the photo that follows it; then any
 * extra photos one per card. Photo order matches newsletter.ts.
 */
export function buildCards(draft: Draft): CardSpec[] {
  const photos = draft.photos.filter((p) => photoExists(draft.id, p));
  const sections = draft.sections.filter((s) => s.heading.trim() || s.body.trim());
  const headerPhoto = photos.shift();

  const cards: CardSpec[] = [];
  sections.forEach((section, i) => {
    const blocks: Block[] = [{ kind: 'section', section }];
    const photo = photos.shift();
    if (photo) blocks.push({ kind: 'photo', photo });
    cards.push({ header: i === 0, headerPhoto: i === 0 ? headerPhoto : undefined, blocks, footer: false });
  });
  if (cards.length === 0) cards.push({ header: true, headerPhoto, blocks: [], footer: false });
  photos.forEach((photo) => cards.push({ header: false, blocks: [{ kind: 'photo', photo }], footer: false }));
  cards[cards.length - 1].footer = true;
  return cards;
}

export function countImages(cards: CardSpec[]): number {
  return cards.reduce(
    (n, c) => n + (c.headerPhoto ? 1 : 0) + c.blocks.filter((b) => b.kind === 'photo').length,
    0,
  );
}

export interface NewsletterCardsHandle {
  /** One view per card, in order. */
  cards: View[];
  /** The whole stack, for a single tall picture. */
  all: View | null;
}

interface Props {
  draft: Draft;
  cards: CardSpec[];
  onImageLoaded: () => void;
}

export const NewsletterCards = forwardRef<NewsletterCardsHandle, Props>(function NewsletterCards(
  { draft, cards, onImageLoaded },
  ref,
) {
  const theme = getTheme(draft.themeName);
  const cardRefs = useRef<(View | null)[]>([]);
  const allRef = useRef<View>(null);

  useImperativeHandle(ref, () => ({
    get cards() {
      return cardRefs.current.slice(0, cards.length).filter((v): v is View => v !== null);
    },
    get all() {
      return allRef.current;
    },
  }));

  const photo = (p: DraftPhoto, bordered: boolean) => (
    <Image
      key={p.id}
      source={{ uri: photoFile(draft.id, p).uri }}
      onLoad={onImageLoaded}
      onError={onImageLoaded}
      style={[
        { width: '100%', aspectRatio: p.width / p.height },
        bordered && { borderWidth: 2, borderColor: theme.imgBorder },
      ]}
    />
  );

  return (
    <View ref={allRef} collapsable={false} style={{ width: CARD_WIDTH, backgroundColor: theme.bodyBg }}>
      {cards.map((card, i) => (
        <View
          key={i}
          ref={(v) => {
            cardRefs.current[i] = v;
          }}
          collapsable={false}
          style={{ padding: 14, backgroundColor: theme.bodyBg }}
        >
          <ShadowBox theme={theme}>
            {card.header && (
              <View style={[s.header, { backgroundColor: theme.headerBg, borderColor: theme.cardBorder }]}>
                <Text style={[s.title, { color: theme.titleColor }]}>
                  {'✧ '}
                  {draft.title.trim() || 'Newsletter'}
                  {' ✧'}
                </Text>
                {draft.subtitle.trim() ? (
                  <Text style={[s.subtitle, { color: theme.subtitleColor }]}>{draft.subtitle}</Text>
                ) : null}
              </View>
            )}
            {card.headerPhoto && photo(card.headerPhoto, false)}
            {card.blocks.length > 0 && (
              <View style={[s.content, { backgroundColor: theme.contentBg }]}>
                {card.blocks.map((block, j) => (
                  <View key={j} style={j > 0 && { marginTop: 22 }}>
                    {block.kind === 'section' ? (
                      <>
                        {block.section.heading.trim() ? (
                          <Text style={[s.heading, { color: theme.questionColor }]}>
                            {block.section.heading.toUpperCase()}
                          </Text>
                        ) : null}
                        <Text style={[s.body, { color: theme.answerColor }]}>{block.section.body}</Text>
                      </>
                    ) : (
                      photo(block.photo, true)
                    )}
                  </View>
                ))}
              </View>
            )}
            {card.footer && (
              <View style={[s.footer, { backgroundColor: theme.footerBg, borderColor: theme.footerBorder }]}>
                <Text style={[s.footerText, { color: theme.footerTextColor }]}>Sent with love {'♥'}</Text>
              </View>
            )}
          </ShadowBox>
        </View>
      ))}
    </View>
  );
});

// epistle's card: 2px border with a hard 4px offset shadow.
function ShadowBox({ theme, children }: { theme: ColorTheme; children: React.ReactNode }) {
  return (
    <View style={{ paddingRight: 4, paddingBottom: 4 }}>
      <View style={[StyleSheet.absoluteFill, { left: 4, top: 4, backgroundColor: theme.cardBorder }]} />
      <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: theme.cardBorder, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { borderBottomWidth: 2, paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center' },
  title: { fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 18, textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontFamily: 'Courier New', fontSize: 12, marginTop: 4 },
  content: { padding: 22 },
  heading: { fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  body: { fontFamily: 'Georgia', fontSize: 16, lineHeight: 26 },
  footer: { borderTopWidth: 2, paddingVertical: 12, alignItems: 'center' },
  footerText: { fontFamily: 'Courier New', fontSize: 12 },
});
