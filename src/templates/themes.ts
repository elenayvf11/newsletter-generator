// Ported verbatim from epistle (lib/buildEmail.ts).

export interface ColorTheme {
  name: string;
  labelColor: string;
  bodyBg: string;
  cardBorder: string;
  headerBg: string;
  titleColor: string;
  subtitleColor: string;
  contentBg: string;
  questionColor: string;
  answerColor: string;
  footerBg: string;
  footerBorder: string;
  footerTextColor: string;
  footerSubColor: string;
  imgBorder: string;
}

// Order matches the picker UI: Purple, Green, Blue, Yellow, Pink, Black & White
export const COLOR_THEMES: ColorTheme[] = [
  {
    name: 'Purple',
    labelColor: '#a870c8',
    bodyBg: '#f0ebff',
    cardBorder: '#c8b4e8',
    headerBg: '#ead8f8',
    titleColor: '#3a2858',
    subtitleColor: '#9070b8',
    contentBg: '#fdf8ff',
    questionColor: '#a870c8',
    answerColor: '#3a2858',
    footerBg: '#f8f2ff',
    footerBorder: '#d8c8f0',
    footerTextColor: '#9070b8',
    footerSubColor: '#c8b4e8',
    imgBorder: '#c8b4e8',
  },
  {
    name: 'Green',
    labelColor: '#508060',
    bodyBg: '#ecf8ee',
    cardBorder: '#a8d8b4',
    headerBg: '#d0ecda',
    titleColor: '#1a3a28',
    subtitleColor: '#508060',
    contentBg: '#f5fcf6',
    questionColor: '#508060',
    answerColor: '#1a3a28',
    footerBg: '#eef8f0',
    footerBorder: '#c0e0c8',
    footerTextColor: '#508060',
    footerSubColor: '#a8d8b4',
    imgBorder: '#a8d8b4',
  },
  {
    name: 'Blue',
    labelColor: '#6090c8',
    bodyBg: '#e8f0ff',
    cardBorder: '#b4c8e8',
    headerBg: '#d8e8f8',
    titleColor: '#28385a',
    subtitleColor: '#7090b8',
    contentBg: '#f8fbff',
    questionColor: '#6090c8',
    answerColor: '#28385a',
    footerBg: '#f2f6ff',
    footerBorder: '#c8d8f0',
    footerTextColor: '#7090b8',
    footerSubColor: '#b4c8e8',
    imgBorder: '#b4c8e8',
  },
  {
    name: 'Yellow',
    labelColor: '#b09040',
    bodyBg: '#fffae8',
    cardBorder: '#e8d8a0',
    headerBg: '#f8ecc0',
    titleColor: '#5a4a18',
    subtitleColor: '#b09050',
    contentBg: '#fffdf5',
    questionColor: '#b09040',
    answerColor: '#5a4a18',
    footerBg: '#fffbf0',
    footerBorder: '#f0e4b0',
    footerTextColor: '#b09050',
    footerSubColor: '#e0cc90',
    imgBorder: '#e8d8a0',
  },
  {
    name: 'Pink',
    labelColor: '#c87090',
    bodyBg: '#fff0f5',
    cardBorder: '#e8b4c8',
    headerBg: '#f8d8e8',
    titleColor: '#5a2838',
    subtitleColor: '#b87090',
    contentBg: '#fff8fb',
    questionColor: '#c87090',
    answerColor: '#5a2838',
    footerBg: '#fff2f6',
    footerBorder: '#f0c8d8',
    footerTextColor: '#b87090',
    footerSubColor: '#e8b4c8',
    imgBorder: '#e8b4c8',
  },
  {
    name: 'Black & White',
    labelColor: '#111111',
    bodyBg: '#f0f0f0',
    cardBorder: '#333333',
    headerBg: '#ffffff',
    titleColor: '#111111',
    subtitleColor: '#555555',
    contentBg: '#ffffff',
    questionColor: '#333333',
    answerColor: '#111111',
    footerBg: '#f8f8f8',
    footerBorder: '#dddddd',
    footerTextColor: '#555555',
    footerSubColor: '#999999',
    imgBorder: '#333333',
  },
];

export function getTheme(name: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.name === name) ?? COLOR_THEMES[0];
}
