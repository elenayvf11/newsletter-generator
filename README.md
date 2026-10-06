# Very Simple Newsletter Creator

An iOS app for writing a family newsletter, adding photos, and sharing it as a
PDF by email, text, AirPrint, or Files. Photos stay on your phone: nothing is
uploaded, and the app has no server, accounts, or analytics.

See [PLAN.md](PLAN.md) for the full plan, tech stack, and privacy design.

## Run it on your iPhone (Expo Go)

1. Install [Node.js LTS](https://nodejs.org) on your Mac.
2. Install **Expo Go** from the App Store on your iPhone.
3. In this folder:
   ```bash
   npm install
   npm start
   ```
4. Scan the QR code with the iPhone Camera app. The app opens in Expo Go and
   reloads every time you save a file.

To use the **iOS Simulator** instead, install Xcode from the Mac App Store, open
it once to finish setup, then press `i` in the `npm start` terminal.

## Checks

```bash
npm run typecheck
npm run lint
```

## How the code is organized

```
src/app/                 Screens (Expo Router: each file is a screen)
  _layout.tsx            Navigation stack, fonts
  index.tsx              Drafts list
  draft/[id].tsx         Editor: title, theme, sections, photos (autosaves)
  preview/[id].tsx       Preview, page format, Share PDF, Print
src/templates/
  themes.ts              The 6 color themes, copied from epistle
  newsletter.ts          Newsletter HTML, ported from epistle's buildEpistleHtml
src/photos/photos.ts     System photo picker, resize + strip location data, draft photo files
src/storage/drafts.ts    Drafts in a local SQLite database
src/export/export.ts     HTML → PDF (expo-print), share sheet, print
src/ui/kit.tsx           Shared colors and components (epistle look)
```
