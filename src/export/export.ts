import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SMS from 'expo-sms';
import { Directory, File, Paths } from 'expo-file-system';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Draft } from '../model/types';
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
  const dir = new Directory(Paths.cache, 'exports');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function baseName(draft: Draft): string {
  const base = draft.title.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  return base || 'Newsletter';
}

/** Moves a generated file into the exports folder under a friendly name (shown as the attachment name). */
function keepAs(uri: string, name: string): File {
  const named = new File(exportsDir(), name);
  if (named.exists) named.delete();
  new File(uri).moveSync(named);
  return named;
}

/** Print-ready A4 PDF, rendered on the device. */
export async function createPdf(draft: Draft): Promise<File> {
  const { uri } = await Print.printToFileAsync({
    html: await draftToHtml(draft),
    width: PAGE_WIDTH,
    height: A4_HEIGHT,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  return keepAs(uri, `${baseName(draft)}.pdf`);
}

async function capture(view: View, name: string): Promise<File> {
  const uri = await captureRef(view, { format: 'jpg', quality: 0.9, result: 'tmpfile' });
  return keepAs(uri, name);
}

/** One picture per card, in order. */
export async function capturePictures(draft: Draft, cards: View[]): Promise<File[]> {
  const base = baseName(draft);
  const files: File[] = [];
  for (let i = 0; i < cards.length; i++) {
    files.push(await capture(cards[i], cards.length > 1 ? `${base} ${i + 1}.jpg` : `${base}.jpg`));
  }
  return files;
}

/** The whole newsletter as one tall picture. */
export function captureTallPicture(draft: Draft, all: View): Promise<File> {
  return capture(all, `${baseName(draft)} (full).jpg`);
}

/** Opens Messages with the pictures attached, so they show right in the conversation. */
export async function textPictures(pictures: File[]): Promise<boolean> {
  if (!(await SMS.isAvailableAsync())) return false;
  await SMS.sendSMSAsync(
    [],
    '',
    { attachments: pictures.map((f) => ({ uri: f.uri, mimeType: 'image/jpeg', filename: f.name })) },
  );
  return true;
}

/**
 * Opens Apple Mail with the pictures in the body and the PDF attached for printing.
 * Returns false when Apple Mail isn't set up on this phone.
 */
export async function emailPictures(draft: Draft, pictures: File[], pdf: File): Promise<boolean> {
  if (!(await MailComposer.isAvailableAsync())) return false;
  await MailComposer.composeAsync({
    subject: draft.title.trim() || 'Newsletter',
    attachments: [...pictures.map((f) => f.uri), pdf.uri],
  });
  return true;
}

/** iOS share sheet for one file: other apps (Gmail, WhatsApp), Save Image, Save to Files. */
export async function shareFile(file: File): Promise<void> {
  const isPdf = file.extension === '.pdf';
  await Sharing.shareAsync(file.uri, {
    mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
    UTI: isPdf ? 'com.adobe.pdf' : 'public.jpeg',
    dialogTitle: 'Share newsletter',
  });
}

export async function printDraft(draft: Draft): Promise<void> {
  await Print.printAsync({ html: await draftToHtml(draft) });
}

/** Removes generated pictures and PDFs. The draft itself is kept until the user deletes it. */
export function clearExports(): void {
  const dir = new Directory(Paths.cache, 'exports');
  if (dir.exists) dir.delete();
}
