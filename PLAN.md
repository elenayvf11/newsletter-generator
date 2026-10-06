# Newsletter Generator — Implementation Plan

An iOS app where you type a newsletter, attach photos, and export a **PDF or
image** you can email, text, print, or save — with **no photos ever leaving the
phone or being stored by the app**.

---

## 0. Decisions made

| Question | Decision |
|---|---|
| Dev machine | **Mac available** → install Xcode for the iOS Simulator and local dev builds (`npx expo run:ios`). EAS cloud builds still used for TestFlight/App Store. |
| Look & feel | Reuse the **6 color themes and the newsletter HTML from epistle** (see §9). |
| Page format | Default **"Scroll" format: one continuous page**, so an emailed PDF reads top-to-bottom with no page breaks. Offer **A4 (paged)** as a secondary option for printing. |
| Drafts | **Save draft text and draft photos**, on-device only (see §2 "Draft photos"). |

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
| Photos stored by the app | Only resized, metadata-stripped copies of the photos you picked, kept in the app's private **Caches** folder for drafts (see below). Never uploaded, never in iCloud backups, deleted with the draft. |
| Photos uploaded | There is **no backend and no network code**. No accounts, analytics, or crash reporters that could transmit content. |
| Hidden metadata (GPS location, device, date) in photos | Every photo is re-encoded (resized + compressed) before going into the newsletter, which strips EXIF/GPS data. Important: photos of kids often carry home location in EXIF. |
| Saving the output | Prefer the Share Sheet ("Save Image" / "Save to Files") so the app never needs Photos permission. If a direct "Save to Photos" button is added later, request only *add-only* permission. |
| App Store privacy label | Can honestly declare **"Data Not Collected."** |

### Draft photos: saving them without "storing photos on the internet"

The goal is that photos never leave the phone. Saving a draft's photos on the
phone itself fits that goal, as long as we control *where* on the phone they go.

Chosen approach: **local copies in the Caches folder**

- When you pick a photo, the app saves a resized copy (EXIF/GPS stripped) to
  `FileSystem.cacheDirectory/drafts/<draftId>/`.
- That folder is in the app's private sandbox. Other apps can't read it, and
  iOS encrypts it while the phone is locked.
- **iOS excludes Caches from iCloud and iTunes backups.** That's why we use it
  instead of the Documents folder, which *is* backed up to iCloud by default.
- Deleting a draft, or (optionally) exporting it, deletes its photo folder.
  Deleting the app deletes everything.
- Trade-off: iOS *may* clear Caches when the phone is very low on storage
  (rare). If that happens, the draft text stays and the app shows "Re-add
  photos" placeholders.
- Optional setting: "Delete draft photos after export" (on by default) and
  auto-delete drafts older than 30 days.

Alternative considered: **save references, not copies.** Store each photo's
Photos-library ID and reload the original when the draft opens. The app never
holds a copy, but it needs a photo-library permission prompt (limited access),
and a photo deleted from the library would also disappear from the draft. We
might offer this later as a setting, but it isn't the default.

Draft text and layout/theme choice are stored in `expo-sqlite`, along with the
list of photo file names, captions, and order for each draft.

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

- **PDF, Scroll format (default):** render the HTML in a hidden WebView,
  measure `document.body.scrollHeight`, then call
  `printToFileAsync({ html, width: 595, height: measuredHeight })`. The result
  is a **single tall page**, so the reader just scrolls in Mail or Preview.
  (595pt = A4 width, so it reads at the same scale as the paged version.)
- **PDF, A4 format:** same HTML, `width: 595, height: 842`, with CSS
  `break-inside: avoid` on photos. Use this one for printing.
- **Image:** render the same HTML in a `react-native-webview` preview (or an
  equivalent RN view) and capture it with `react-native-view-shot`. Scroll format
  exports one tall image, which also works pasted **inline in an email body**
  (no attachment to open). For texting very long newsletters, offer splitting
  into several images.
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
- Photo pipeline: pick → resize to ~1600px long edge, JPEG ~0.8 → `cacheDirectory/drafts/<id>/`.
- Single autosaved draft (text + photo list) in `expo-sqlite`.
- One template using the ported epistle-email.com color themes.
- Export **Scroll-format PDF** → Share Sheet. Test Mail (scrolls as one page), Messages, Save to Files.
- Delete the generated file after sharing.
- ✅ **Done when** you can send a real newsletter to family from your phone.

### Phase 2 — Image export & layouts (1 week)
- Export as one tall PNG/JPEG (optionally split) for texting / inline email.
- A4 paged PDF option for printing.
- 2–3 templates (classic, photo grid, photo-first), color/font themes.
- Photo captions.

### Phase 3 — Polish (1 week)
- Multiple drafts list; delete-draft removes its photo folder.
- Settings: "Delete draft photos after export", auto-expire old drafts.
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

## 9. Porting from epistle (`elenayvf11/epistle`)

The web app's newsletter rendering is already a **pure TypeScript function that
returns an HTML string with inline styles**. That's exactly what `expo-print`
and a WebView need, so most of it moves over as-is.

| epistle file | What it has | In the iOS app |
|---|---|---|
| `lib/buildEmail.ts` → `COLOR_THEMES`, `ColorTheme` | 6 themes (Purple, Green, Blue, Yellow, Pink, Black & White), each with 15 color tokens | **Copy verbatim** → `src/templates/themes.ts`. |
| `lib/buildEmail.ts` → `buildEpistleHtml` / `buildPreviewHtml` | 600px card layout: header (title + month/year), header photo, Q&A sections with photos interleaved, footer. Courier New + Georgia fonts (both built into iOS). | **Port** → `src/templates/epistle.ts`. Embed photos as base64 `data:` URIs directly, like `buildPreviewHtml` does (no `cid:` / MIME). Remove the "A print-ready PDF is attached to this email" banner. Keep the "made with epistle" footer link, or make it optional. Add `@page` CSS and a width option for the Scroll vs A4 formats. |
| `lib/buildEmail.ts` → `escapeHtml`, `getCurrentMonthYear` | Helpers | Copy. |
| `lib/buildEmail.ts` → `buildMimeMessage` | Gmail MIME assembly | **Drop**: the Share Sheet replaces it. |
| `lib/buildPdf.tsx` (`@react-pdf/renderer`) | A separate PDF layout that duplicates the HTML one | **Drop**: `expo-print` renders the same HTML to PDF, so there's one template instead of two. |
| `lib/compressImage.ts` | Canvas resize to 1200px, JPEG 0.75 | Replace with `expo-image-manipulator` using the **same 1200px / 0.75 settings**, which also strips EXIF. |
| `lib/constants.ts` → `QUESTIONS`, `MAX_Q = 3`, `MAX_P = 5` | Guided prompts with `[child]` substitution | Copy. Use them as optional **section prompts** (see below). Consider raising the photo limit. |
| `STARTER_CSS` / custom-CSS editor | Power-user styling | Skip for v1. Typing CSS on a phone is painful. |
| `lib/auth.ts`, `app/api/*`, `next-auth`, `googleapis` | Google sign-in and Gmail drafts | **Drop entirely**: no accounts, no server. |
| `app/globals.css` (pastel cards, 2px borders, hard 4px offset shadow, Space Mono) | Web UI look | Recreate in React Native styles so the app *feels* like epistle. Load Space Mono with `@expo-google-fonts/space-mono`. |
| `privacy_policy.txt`, `terms_and_conditions.txt` | Legal text | Rewrite for the app ("no data collected, nothing leaves your device") and host it for the App Store listing. |

### Content model: questions vs. free text

epistle builds the newsletter from **child name + up to 3 answered prompts**.
The iOS app keeps that structure but makes it more flexible:

```ts
type Section = { heading: string; body: string };   // heading = a prompt or custom text
type Newsletter = {
  childName: string;          // title becomes "✧ {name}'s Epistle ✧"
  sections: Section[];        // defaults to one "General Update" section
  photoIds: string[];         // first = header photo, then one after each section, rest at end
  themeName: string;          // one of COLOR_THEMES
  format: 'scroll' | 'a4';
};
```

A new newsletter starts with a single **"General Update"** section (the free
text box you described). "Add section" offers the epistle prompts or a custom
heading. The photo placement rule stays exactly as epistle does it.

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

1. Should exporting a newsletter delete its draft photos by default, or keep
   them until you delete the draft?
2. Keep the "made with epistle" footer and the `✧ {name}'s Epistle ✧` title,
   or make the title freely editable (e.g. "The Smith Family — Fall 2026")?
3. Should the app keep the "epistle" name, or ship under a new one?
