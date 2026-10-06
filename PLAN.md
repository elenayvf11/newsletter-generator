# Newsletter Generator — Implementation Plan

An iOS app where you type a newsletter, attach photos, and export a **PDF or
image** you can email, text, print, or save — with **no photos ever leaving the
phone or being stored by the app**.

---

## 1. Product flow

```
Open app → Write body text → Add photos → Pick layout → Preview
        → Export (PDF or Image) → iOS Share Sheet
              ├─ Mail / Gmail / Outlook
              ├─ Messages / WhatsApp
              ├─ Print (AirPrint)
              └─ Save to Files / Save to Photos
```

Because the iOS **Share Sheet** handles delivery, there is no Gmail (or any
email) integration to build or maintain. The app's job ends at "here is a file."

---

## 2. Privacy design (the core promise)

| Concern | How it is handled |
|---|---|
| Photo library access | Use the iOS system photo picker (`PHPickerViewController`, exposed by `expo-image-picker`). It runs **outside the app's process**; the app receives only the photos the user taps. On iOS 14+ this needs **no photo-library permission prompt at all**. |
| Photos stored by the app | Selected photos live only in the app's temporary cache while you edit. They are deleted after export and on next launch. Nothing is written to a database. |
| Photos uploaded | There is **no backend and no network code**. No accounts, analytics, or crash reporters that could transmit content. |
| Hidden metadata (GPS location, device, date) in photos | Every photo is re-encoded (resized + compressed) before going into the newsletter, which strips EXIF/GPS data. Important: photos of kids often carry home location in EXIF. |
| Saving the output | Prefer the Share Sheet ("Save Image" / "Save to Files") so the app never needs Photos permission. If a direct "Save to Photos" button is added later, request only *add-only* permission. |
| App Store privacy label | Can honestly declare **"Data Not Collected."** |

What *is* stored: optionally, the draft **text** (and layout choice) so you
don't lose your writing. Photos are re-picked if you reopen a draft.

---

## 3. Recommended tech stack

You know TypeScript + React, so use **React Native with Expo**. You write
TypeScript/React components; Expo compiles them into a real native iOS app.
You do **not** need to learn Swift or Xcode to ship this.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Expo (React Native) + TypeScript** | Same mental model as React web. Huge ecosystem. |
| Navigation | **Expo Router** | File-based routing (like Next.js). |
| Photo picking | `expo-image-picker` | Wraps the private system picker described above. |
| Photo processing | `expo-image-manipulator` | Resize/compress; strips metadata. |
| PDF generation | `expo-print` → `printToFileAsync({ html })` | You build the newsletter as **HTML/CSS** (reusable from epistle-email.com) and iOS renders it to a PDF on-device. |
| Image export | `react-native-view-shot` | Captures the rendered newsletter view as a PNG/JPEG. |
| Share / print | `expo-sharing` (Share Sheet), `expo-print` (`printAsync`) | Native delivery, no integrations. |
| Draft text storage | `expo-sqlite` (kv store) or `@react-native-async-storage/async-storage` | Local only. |
| Temp files | `expo-file-system` | Read images as base64, clean up cache. |
| Builds & distribution | **EAS Build / EAS Submit** (Expo's cloud) | Builds iOS apps in the cloud — **no Mac required** to produce a build. |

### Alternatives considered

- **Swift + SwiftUI (native):** best-in-class iOS, but a new language and
  requires a Mac with Xcode. Worth it only if you want to go deep on iOS.
- **Capacitor (wrap a web app):** could reuse more of epistle-email.com
  directly, but a web view feels less native and photo/file handling is clunkier.
- **PWA (installable website):** no App Store, but limited file/share support
  on iOS and weaker privacy story ("it's a website").

---

## 4. Tools & accounts you'll need

| Item | Needed when | Notes |
|---|---|---|
| Node.js (LTS) + VS Code | Day 1 | You likely have these. |
| **Expo Go** app on your iPhone | Day 1 | Scan a QR code to run your app live on your phone while developing. Free. |
| Expo account (free) | Day 1 | For EAS builds. |
| **Apple Developer Program** ($99/yr) | When you want to install a real build / TestFlight / App Store | Not needed while prototyping in Expo Go. |
| Mac + Xcode | Optional | Gives you the iOS Simulator and local builds. EAS cloud builds cover you without one. |

Glossary for a web developer:

- **Expo Go** ≈ a dev server viewer; runs your JS without a full build.
- **Development build** ≈ your own custom Expo Go; needed once you add a
  native library Expo Go doesn't include (e.g. `react-native-view-shot` is
  fine in Expo Go; most `expo-*` packages are).
- **TestFlight** ≈ Apple's beta channel; share builds with family/testers.
- **App Store Connect** ≈ the dashboard where you submit and manage the app.
- **Bundle identifier** ≈ your app's unique ID, e.g. `com.yourname.newsletter`.
- **Info.plist usage strings** ≈ the text shown in permission prompts (set
  via `app.json` in Expo).

---

## 5. Architecture

Everything runs on-device. One-way data flow:

```
 ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────┐
 │ Compose      │──▶│ Newsletter model │──▶│ Renderer         │──▶│ Exporter     │
 │ (text, pics) │   │ (in memory)      │   │ HTML template /  │   │ PDF | PNG    │
 └──────────────┘   └──────────────────┘   │ RN preview view  │   │ → Share Sheet│
        │                                  └──────────────────┘   └──────────────┘
        ▼
  System photo picker → resize/strip EXIF → temp cache (deleted after export)
```

### Data model

```ts
type Newsletter = {
  id: string;
  title: string;          // e.g. "The Smith Family — Fall 2026"
  date: string;
  body: string;           // plain text (later: simple markdown)
  photos: Photo[];        // in-memory only, never persisted
  templateId: TemplateId; // "classic" | "grid" | "photo-first" ...
};

type Photo = {
  uri: string;            // file:// in app cache (resized, EXIF-stripped)
  width: number;
  height: number;
  caption?: string;
};
```

### Rendering strategy

Use **one HTML/CSS template per layout** as the source of truth:

- **PDF:** inject text + base64 images into the HTML → `expo-print` → PDF
  (proper US Letter / A4 pages, prints cleanly).
- **Image:** render the same HTML in a `react-native-webview` preview (or an
  equivalent RN view) and capture it with `react-native-view-shot`. For long
  newsletters, export one image per page so texts aren't absurdly tall.
- **Preview** in the app uses the same HTML so what you see is what you get.

This also lets you port templates/CSS straight from epistle-email.com.

### Suggested folder layout

```
app/                    # Expo Router screens
  index.tsx             # Drafts list / "New newsletter"
  compose.tsx           # Title + body text + photo strip
  preview.tsx           # Template picker + live preview + Export
src/
  model/newsletter.ts   # types + state (React context or Zustand)
  photos/pick.ts        # picker + resize/strip + cache cleanup
  templates/            # classic.ts, grid.ts ... → (newsletter) => html string
  export/pdf.ts         # printToFileAsync
  export/image.ts       # view-shot capture
  export/share.ts       # Sharing.shareAsync / Print.printAsync
  storage/drafts.ts     # text-only draft persistence
```

---

## 6. Milestones

### Phase 0 — Setup (½ day)
- `npx create-expo-app@latest newsletter --template` (TypeScript).
- Run on your iPhone with Expo Go. Commit.
- Add ESLint/Prettier, a basic `app.json` (name, bundle id, icon placeholder).

### Phase 1 — MVP: text + photos → PDF → share (1–2 weeks of evenings)
- Compose screen: title, multi-line body, "Add photos" (multi-select), reorder/remove.
- Photo pipeline: pick → resize to ~1600px long edge, JPEG ~0.8 → cache.
- One "Classic" HTML template (header, date, body, photo grid).
- Export PDF → Share Sheet. Test Mail, Messages, Print, Save to Files.
- Delete cached photos and the generated file after sharing.
- ✅ **Done when** you can send a real newsletter to family from your phone.

### Phase 2 — Image export & layouts (1 week)
- Export as PNG/JPEG (per page) for texting.
- 2–3 templates (classic, photo grid, photo-first), color/font themes.
- Photo captions.

### Phase 3 — Polish (1 week)
- Text-only draft autosave + drafts list.
- Simple formatting (bold, headings, bullet lists via lightweight markdown).
- Live preview, page-break handling, large-photo performance.
- Startup cleanup of any leftover temp files.
- Accessibility (Dynamic Type, VoiceOver labels), dark mode.

### Phase 4 — Ship (1 week, mostly waiting on Apple)
- Enroll in Apple Developer Program.
- `eas build --platform ios` → `eas submit` → TestFlight for family testers.
- App Store listing: screenshots, description, privacy policy page
  (can be a simple page on epistle-email.com stating no data is collected),
  privacy label "Data Not Collected."
- Submit for review.

### Later ideas
- iPad layout; Android (Expo makes this mostly free).
- Share Extension: "Add to newsletter" from the Photos app.
- Reusable recipient-agnostic "issues" archive (text only).

---

## 7. Risks & gotchas

- **Large photos → huge PDFs / memory crashes.** Always resize before
  embedding. Target < 5 MB per PDF so it emails cleanly.
- **HEIC photos** (iPhone default) — `expo-image-manipulator` converts to JPEG;
  do this for every photo.
- **Page breaks** in HTML→PDF: use CSS `break-inside: avoid` on photos.
- **Expo Go limits:** if a library needs custom native code, switch to an
  Expo *development build* (`eas build --profile development`). Plan for this
  by Phase 2.
- **App Review:** Apple rejects apps that feel like a thin website; the native
  picker, share sheet, and offline PDF generation make this a real app.

---

## 8. Open questions

1. Do you have a Mac? (Not required, but changes the dev loop.)
2. Which epistle-email.com templates/styles do you want to carry over?
3. PDF page size: US Letter, A4, or a single long scrolling page?
4. Should drafts persist text at all, or should the app forget everything
   after each export (maximum privacy)?
