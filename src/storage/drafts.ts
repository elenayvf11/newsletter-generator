import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { COLOR_THEMES } from '../templates/themes';
import { deleteDraftPhotos } from '../photos/photos';
import { Draft, getCurrentMonthYear } from '../model/types';

// Drafts (text, layout and the list of photo file names) live in a local SQLite
// database. Photo files themselves live in the Caches folder (see photos.ts).

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('drafts.db');
    db.execSync(
      'CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY NOT NULL, updated_at INTEGER NOT NULL, data TEXT NOT NULL);',
    );
  }
  return db;
}

export function newDraft(): Draft {
  const now = Date.now();
  const draft: Draft = {
    id: randomUUID(),
    title: '',
    subtitle: getCurrentMonthYear(),
    sections: [{ id: randomUUID(), heading: 'General Update', body: '' }],
    photos: [],
    themeName: COLOR_THEMES[0].name,
    createdAt: now,
    updatedAt: now,
  };
  saveDraft(draft);
  return draft;
}

export function saveDraft(draft: Draft): void {
  getDb().runSync(
    'INSERT OR REPLACE INTO drafts (id, updated_at, data) VALUES (?, ?, ?)',
    draft.id,
    draft.updatedAt,
    JSON.stringify(draft),
  );
}

export function getDraft(id: string): Draft | null {
  const row = getDb().getFirstSync<{ data: string }>('SELECT data FROM drafts WHERE id = ?', id);
  return row ? (JSON.parse(row.data) as Draft) : null;
}

export function listDrafts(): Draft[] {
  return getDb()
    .getAllSync<{ data: string }>('SELECT data FROM drafts ORDER BY updated_at DESC')
    .map((row) => JSON.parse(row.data) as Draft);
}

export function deleteDraft(id: string): void {
  getDb().runSync('DELETE FROM drafts WHERE id = ?', id);
  deleteDraftPhotos(id);
}
