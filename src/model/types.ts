export type PageFormat = 'scroll' | 'a4';

export interface Section {
  id: string;
  heading: string;
  body: string;
}

export interface DraftPhoto {
  id: string;
  fileName: string; // inside the draft's photo folder, see src/photos/photos.ts
  width: number;
  height: number;
}

export interface Draft {
  id: string;
  title: string;
  subtitle: string;
  sections: Section[];
  photos: DraftPhoto[]; // first = header photo, then one after each section, rest at the end
  themeName: string;
  format: PageFormat;
  createdAt: number;
  updatedAt: number;
}

export const MAX_PHOTOS = 10;

// Adapted from epistle's QUESTIONS, rewritten as headings without the [child] placeholder.
export const SECTION_PROMPTS = [
  'General Update',
  'Favorite Food Lately',
  'Favorite Song Lately',
  'Favorite Book Lately',
  'A Family Adventure',
  'Top Five Favorite Things',
  'Current Special Interest',
  'A Recent Favorite Moment',
];

export function getCurrentMonthYear(): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}
