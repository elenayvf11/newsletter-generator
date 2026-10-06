import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Draft, DraftPhoto } from '../model/types';
import { photoExists, photoFile } from '../photos/photos';
import { splitText } from './splitText';
import { ColorTheme, getTheme } from './themes';

// The newsletter drawn with native views so it can be captured as pictures
// (react-native-view-shot) for texting and for the body of an email. It follows
// the same layout and colors as the PDF template in newsletter.ts.

export const CARD_WIDTH = 390;

// Keeps every card shorter than the screen, so it can be scrolled fully into
// view before it's captured (off-screen parts can come out blank).
const MAX_PHOTO_HEIGHT = 440;
const HEADER_PHOTO_MAX_HEIGHT = 360;
const OUTER_PADDING = 14;
const BOX_CHROME = 4 + 2 * 2; // shadow offset + borders
const CONTENT_PADDING = 22;

type Block =
  | { kind: 'text'; heading?: string; text: string }
  | { kind: 'photo'; photo: DraftPhoto };

export interface CardSpec {
  header: boolean;
  headerPhoto?: DraftPhoto;
  blocks: Block[];
  footer: boolean;
}

/**
 * Splits a draft into picture-sized cards:
 *   1. the title, with the header photo (or the first text if there's no photo);
 *   2. each section's text, split across cards when it's long;
 *   3. the photo that follows each section, on its own card;
 *   4. any extra photos, one per card.
 * Photo order matches newsletter.ts.
 */
export function buildCards(draft: Draft): CardSpec[] {
  const photos = draft.photos.filter((p) => photoExists(draft.id, p));
  const headerPhoto = photos.shift();
  const titleCard: CardSpec = { header: true, headerPhoto, blocks: [], footer: false };
  const cards: CardSpec[] = [titleCard];

  for (const section of draft.sections) {
    const heading = section.heading.trim();
    const chunks = splitText(section.body);
    if (!heading && chunks.length === 0) continue;

    (chunks.length ? chunks : ['']).forEach((text, i) => {
      const block: Block = { kind: 'text', heading: i === 0 && heading ? heading : undefined, text };
      const titleHasRoom = !titleCard.headerPhoto && titleCard.blocks.length === 0 && cards.length === 1;
      if (titleHasRoom) titleCard.blocks.push(block);
      else cards.push({ header: false, blocks: [block], footer: false });
    });

    const photo = photos.shift();
    if (photo) cards.push({ header: false, blocks: [{ kind: 'photo', photo }], footer: false });
  }

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
  /** Each card's top edge, relative to the top of the stack. */
  cardOffsets: number[];
  /** The whole stack, for a single tall picture. */
  all: View | null;
}

interface Props {
  draft: Draft;
  cards: CardSpec[];
  width?: number;
  onImageLoaded: () => void;
}

export const NewsletterCards = forwardRef<NewsletterCardsHandle, Props>(function NewsletterCards(
  { draft, cards, width = CARD_WIDTH, onImageLoaded },
  ref,
) {
  const theme = getTheme(draft.themeName);
  const cardRefs = useRef<(View | null)[]>([]);
  const offsets = useRef<number[]>([]);
  const allRef = useRef<View>(null);

  useImperativeHandle(ref, () => ({
    get cards() {
      return cardRefs.current.slice(0, cards.length).filter((v): v is View => v !== null);
    },
    get cardOffsets() {
      return offsets.current.slice(0, cards.length);
    },
    get all() {
      return allRef.current;
    },
  }));

  const boxWidth = width - OUTER_PADDING * 2 - BOX_CHROME;

  const headerImage = (p: DraftPhoto) => {
    const height = Math.min(boxWidth / (p.width / p.height), HEADER_PHOTO_MAX_HEIGHT);
    return (
      <Image
        source={{ uri: photoFile(draft.id, p).uri }}
        onLoad={onImageLoaded}
        onError={onImageLoaded}
        resizeMode="cover"
        style={{ width: boxWidth, height }}
      />
    );
  };

  const framedImage = (p: DraftPhoto) => {
    const aspect = p.width / p.height;
    const available = boxWidth - CONTENT_PADDING * 2;
    const imgWidth = Math.min(available, MAX_PHOTO_HEIGHT * aspect);
    return (
      <Image
        source={{ uri: photoFile(draft.id, p).uri }}
        onLoad={onImageLoaded}
        onError={onImageLoaded}
        style={{
          width: imgWidth,
          height: imgWidth / aspect,
          alignSelf: 'center',
          borderWidth: 2,
          borderColor: theme.imgBorder,
        }}
      />
    );
  };

  return (
    <View ref={allRef} collapsable={false} style={{ width, backgroundColor: theme.bodyBg }}>
      {cards.map((card, i) => (
        <View
          key={i}
          ref={(v) => {
            cardRefs.current[i] = v;
          }}
          onLayout={(e) => {
            offsets.current[i] = e.nativeEvent.layout.y;
          }}
          collapsable={false}
          style={{ padding: OUTER_PADDING, backgroundColor: theme.bodyBg }}
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
            {card.headerPhoto && headerImage(card.headerPhoto)}
            {card.blocks.map((block, j) => (
              <View key={j} style={[s.content, { backgroundColor: theme.contentBg }]}>
                {block.kind === 'text' ? (
                  <>
                    {block.heading ? (
                      <Text style={[s.heading, { color: theme.questionColor }]}>{block.heading.toUpperCase()}</Text>
                    ) : null}
                    {block.text ? <Text style={[s.body, { color: theme.answerColor }]}>{block.text}</Text> : null}
                  </>
                ) : (
                  framedImage(block.photo)
                )}
              </View>
            ))}
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
  content: { padding: CONTENT_PADDING },
  heading: { fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  body: { fontFamily: 'Georgia', fontSize: 16, lineHeight: 26 },
  footer: { borderTopWidth: 2, paddingVertical: 12, alignItems: 'center' },
  footerText: { fontFamily: 'Courier New', fontSize: 12 },
});
