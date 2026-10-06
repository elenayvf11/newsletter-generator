import { Section } from '../model/types';
import { ColorTheme } from './themes';

// Ported from epistle's buildEpistleHtml (lib/buildEmail.ts). Photos are
// embedded as data: URIs (no cid:/MIME), the title is free text, and the
// email-only banner and "made with epistle" link are gone.

// The page is laid out at the A4 width (595 x 842 points). Both export formats
// use the same HTML: "scroll" prints it onto one tall page, "a4" splits it.
export const PAGE_WIDTH = 595;
export const A4_HEIGHT = 842;

export interface NewsletterContent {
  title: string;
  subtitle: string;
  sections: Section[];
  photos: (string | null)[]; // data: URIs; null when a draft photo is missing
  theme: ColorTheme;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function photoBlock(src: string, theme: ColorTheme): string {
  return [
    '<div class="nl-photo-block" style="margin-bottom:32px;text-align:center;">',
    `<img class="nl-photo" src="${src}" style="max-width:100%;display:block;margin:0 auto;border:2px solid ${theme.imgBorder};">`,
    '</div>',
  ].join('');
}

export function buildNewsletterHtml({ title, subtitle, sections, photos, theme }: NewsletterContent): string {
  const remaining = photos.filter((p): p is string => p !== null);
  const headerPhoto = remaining.shift();

  const blocks: string[] = [];
  sections.forEach((section) => {
    if (!section.heading.trim() && !section.body.trim()) return;
    blocks.push('<div class="nl-section" style="margin-bottom:32px;">');
    if (section.heading.trim()) {
      blocks.push(
        `<p class="nl-heading" style="font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:bold;color:${theme.questionColor};text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">`,
        escapeHtml(section.heading),
        '</p>',
      );
    }
    blocks.push(
      `<p class="nl-body" style="font-family:Georgia,serif;font-size:17px;line-height:1.7;color:${theme.answerColor};margin:0;">`,
      escapeHtml(section.body).replace(/\n/g, '<br>'),
      '</p>',
      '</div>',
    );
    const next = remaining.shift();
    if (next) blocks.push(photoBlock(next, theme));
  });
  remaining.forEach((src) => blocks.push(photoBlock(src, theme)));

  const header = headerPhoto
    ? `<img class="nl-photo" src="${headerPhoto}" style="width:100%;display:block;margin:0 auto;">`
    : '';

  // print-color-adjust keeps theme backgrounds in the PDF; WebKit drops them otherwise.
  const css = [
    'html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '* { box-sizing: border-box; }',
    '.nl-photo-block, .nl-photo { break-inside: avoid; page-break-inside: avoid; }',
    '.nl-content > :last-child { margin-bottom: 0 !important; }',
  ].join('\n');

  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8">',
    `<meta name="viewport" content="width=${PAGE_WIDTH}">`,
    `<style>${css}</style></head>`,
    `<body class="nl-page" style="margin:0;padding:20px;background:${theme.bodyBg};">`,
    `<div class="nl-card" style="width:100%;margin:0 auto;background:#fff;border:2px solid ${theme.cardBorder};box-shadow:4px 4px 0px ${theme.cardBorder};">`,

    `<div class="nl-header" style="background:${theme.headerBg};border-bottom:2px solid ${theme.cardBorder};padding:24px 32px;text-align:center;">`,
    `<h1 class="nl-title" style="color:${theme.titleColor};font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:bold;margin:0 0 4px;letter-spacing:0.5px;">`,
    `✧ ${escapeHtml(title.trim() || 'Newsletter')} ✧`,
    '</h1>',
    subtitle.trim()
      ? `<p class="nl-subtitle" style="color:${theme.subtitleColor};font-family:'Courier New',Courier,monospace;font-size:13px;margin:0;">${escapeHtml(subtitle)}</p>`
      : '',
    '</div>',

    header,

    `<div class="nl-content" style="padding:36px;background:${theme.contentBg};">`,
    blocks.join(''),
    '</div>',

    `<div class="nl-footer" style="padding:16px 32px;background:${theme.footerBg};text-align:center;border-top:2px solid ${theme.footerBorder};">`,
    `<p style="color:${theme.footerTextColor};font-family:'Courier New',Courier,monospace;font-size:13px;margin:0;">`,
    'Sent with love ♥',
    '</p>',
    '</div>',

    '</div>',
    '</body></html>',
  ].join('');
}
