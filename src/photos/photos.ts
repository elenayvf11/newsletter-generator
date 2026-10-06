import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

import { DraftPhoto } from '../model/types';

// Same settings as epistle's compressImage.ts.
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.75;

// Draft photos are kept in Caches/drafts/<draftId>/. iOS keeps the Caches folder
// private to the app and leaves it out of iCloud and device backups. It may
// clear it when storage is very low, so callers must handle missing files.
function draftDir(draftId: string): Directory {
  return new Directory(Paths.cache, 'drafts', draftId);
}

export function photoFile(draftId: string, photo: DraftPhoto): File {
  return new File(draftDir(draftId), photo.fileName);
}

export function photoExists(draftId: string, photo: DraftPhoto): boolean {
  return photoFile(draftId, photo).exists;
}

/**
 * Opens the iOS system photo picker. It runs outside the app, so no photo
 * library permission is needed and the app only receives the photos tapped.
 * Each photo is resized and re-encoded as JPEG, which drops EXIF data such as
 * GPS location, then saved into the draft's folder.
 */
export async function pickPhotos(draftId: string, limit: number): Promise<DraftPhoto[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
    exif: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return [];

  const dir = draftDir(draftId);
  if (!dir.exists) dir.create({ intermediates: true });

  const photos: DraftPhoto[] = [];
  for (const asset of result.assets.slice(0, limit)) {
    const context = ImageManipulator.manipulate(asset.uri);
    if (asset.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

    const id = randomUUID();
    const fileName = `${id}.jpg`;
    const tmp = new File(saved.uri);
    tmp.moveSync(new File(dir, fileName));
    photos.push({ id, fileName, width: saved.width, height: saved.height });
  }
  return photos;
}

export function deletePhoto(draftId: string, photo: DraftPhoto): void {
  const file = photoFile(draftId, photo);
  if (file.exists) file.delete();
}

export function deleteDraftPhotos(draftId: string): void {
  const dir = draftDir(draftId);
  if (dir.exists) dir.delete();
}

/** Returns a data: URI for embedding in the newsletter HTML, or null if iOS cleared the file. */
export async function photoDataUri(draftId: string, photo: DraftPhoto): Promise<string | null> {
  const file = photoFile(draftId, photo);
  if (!file.exists) return null;
  return `data:image/jpeg;base64,${await file.base64()}`;
}
