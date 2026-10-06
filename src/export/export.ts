import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';

import { Draft, PageFormat } from '../model/types';
import { photoDataUri } from '../photos/photos';
import { getTheme } from '../templates/themes';
import { A4_HEIGHT, PAGE_WIDTH, buildNewsletterHtml } from '../templates/newsletter';

export async function draftToHtml(draft: Draft): Promise<string> {
  const photos = await Promise.all(draft.photos.map((p) => photoDataUri(draft.id, p)));
  return buildNewsletterHtml({
    title: draft.title,
    subtitle: draft.subtitle,
    sections: draft.sections,
    photos,
    theme: getTheme(draft.themeName),
  });
}

function exportsDir(): Directory {
  return new Directory(Paths.cache, 'exports');
}

function fileNameFor(draft: Draft): string {
  const base = draft.title.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  return `${base || 'Newsletter'}.pdf`;
}

/**
 * Renders the newsletter to a PDF on the device.
 * For "scroll", `contentHeight` is the measured height of the HTML at PAGE_WIDTH
 * (from the preview WebView) so the whole newsletter fits on one tall page.
 */
export async function createPdf(draft: Draft, format: PageFormat, contentHeight?: number): Promise<File> {
  const html = await draftToHtml(draft);
  const height = format === 'scroll' && contentHeight ? Math.ceil(contentHeight) + 2 : A4_HEIGHT;
  const { uri } = await Print.printToFileAsync({
    html,
    width: PAGE_WIDTH,
    height,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  // Give the file a friendly name so the email attachment isn't a random ID.
  const dir = exportsDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const named = new File(dir, fileNameFor(draft));
  if (named.exists) named.delete();
  new File(uri).moveSync(named);
  return named;
}

export async function sharePdf(file: File): Promise<void> {
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Share newsletter',
  });
}

export async function printDraft(draft: Draft): Promise<void> {
  await Print.printAsync({ html: await draftToHtml(draft) });
}

/** Removes generated PDFs. The draft itself is kept until the user deletes it. */
export function clearExports(): void {
  const dir = exportsDir();
  if (dir.exists) dir.delete();
}
