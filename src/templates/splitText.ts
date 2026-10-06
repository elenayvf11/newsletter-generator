// Splits long text into picture-sized chunks so no card is taller than the
// screen. Breaks at paragraphs first, then sentences, then words.

// About 14 lines of 16pt Georgia at the card's text width.
export const MAX_CHUNK_CHARS = 560;

function splitOn(piece: string, pattern: RegExp): string[] {
  const parts = piece.split(pattern).filter((p) => p.length > 0);
  return parts.length > 1 ? parts : [piece];
}

function pack(parts: string[], joiner: string, max: number, fallback: (p: string) => string[]): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const part of parts) {
    if (part.length > max) {
      if (current) chunks.push(current);
      current = '';
      chunks.push(...fallback(part));
      continue;
    }
    const next = current ? current + joiner + part : part;
    if (next.length > max) {
      chunks.push(current);
      current = part;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function byWords(text: string, max: number): string[] {
  return pack(splitOn(text, / +/), ' ', max, (w) => {
    const out: string[] = [];
    for (let i = 0; i < w.length; i += max) out.push(w.slice(i, i + max));
    return out;
  });
}

function bySentences(text: string, max: number): string[] {
  return pack(splitOn(text, /(?<=[.!?…])\s+/), ' ', max, (s) => byWords(s, max));
}

// Aim for evenly sized cards (e.g. 2 × 375 rather than 650 + 100), with some
// slack so breaks can land on a paragraph or sentence.
function balanced(length: number, max: number): number {
  return Math.min(max, Math.ceil(length / Math.ceil(length / max)) + 80);
}

export function splitText(text: string, max = MAX_CHUNK_CHARS): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const target = balanced(trimmed.length, max);
  return pack(trimmed.split('\n'), '\n', target, (p) => bySentences(p, balanced(p.length, max)))
    .map((c) => c.trim())
    .filter(Boolean);
}
