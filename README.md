# SORTA

Smart Waste Kiosk & Digital Waste Bank Progressive Web App (PWA) for household and community waste sorting, real-time value calculation, multi-household batch accumulation, and gamified recycling rewards.

---

## Key Features

### Unified Authentication & Role-Based Workflows
Sign in using an account code/username and password. The login screen supports instant category switching with prefilled demo credentials so testers can evaluate both workflows out of the box.

- **Perorangan (Household Account)**: Individual households track personal savings, complete daily sorting missions, unlock achievement badges, review waste deposits, and withdraw earned balances.
- **Pengelola (Community Pos / Admin)**: Waste bank coordinators register households, classify homes as self-sorting (`MANDIRI`) or pos-managed (`KELOLAAN_POS`), batch-accumulate single drop-offs evenly across multiple non-mandiri households, customize buyer material prices, and process citizen payouts.

### 5-Tab Mobile-First Navigation
- **Home**: Adaptive overview displaying personal savings or community totals, live fill levels across 3 physical bins, daily missions, and the 3 latest deposits.
- **Bank Sampah**: Impact summary metrics and circular community target (`50 kg`) paired with 3 compact sub-tabs:
  - **Peringkat**: Searchable, filterable, and sortable compact leaderboard. Clicking any household opens a detailed modal with full stats, unlocked badges, recent deposits, and payout triggers.
  - **Riwayat**: Searchable and sortable logs for both waste deposits and balance withdrawals (`GoPay`, `OVO`, `Token Listrik PLN`, `Kas Tunai RT`).
  - **Harga**: Searchable and sortable material buy-rate catalog (editable by `Pengelola`, read-only for `Perorangan`).
- **Kamera (Center Action)**: Live camera stream inspection, image file upload, or manual material entry with optional hardware load-cell weight input, motion-triggered auto-scan, 3-second auto-commit countdown, 3-bin directional cues, and Indonesian Web Speech / Web Audio feedback.
- **Perangkat**: Theme preferences (`Terang`, `Gelap`, `Sistem`), motion sensitivity tuning, **Web Bluetooth** pairing for **ESP32 + HX711** digital scales, optional BYOK Vision API configuration (stored locally in `localStorage`), audio verification, kiosk fullscreen toggle, and reset-to-seed maintenance.
- **Profil**: Active session badge, quick role switch and sign-out controls, household profile editor & badge gallery (`Perorangan`), and searchable household sorting-mode manager (`Pengelola`).

---

## Physical Bins & Material Catalog

| Bin | Code | Purpose | Materials Included |
| :--- | :--- | :--- | :--- |
| Left | `TONG KIRI` | Compostable Organic | Food waste & organic scraps (`ORGANIC_BIO`) |
| Center | `TONG TENGAH` | Recyclable Value | Clear PET (`PET_CLEAR`), Aluminum Can (`ALU_CAN`), HDPE (`HDPE_BOTTLE`), Cardboard (`CARDBOARD`), PP Cup (`PP_CUP`), Glass Bottle (`GLASS_BTL`) |
| Right | `TONG KANAN` | Residual / Reject | Multilayer & non-recyclable waste (`RESIDUE_GEN`) |

---

## Seed Credentials for Testing

Default password for all pre-seeded accounts: **`sorta123`**

| Username | Role | Display Name | Scope |
| :--- | :--- | :--- | :--- |
| `warga-b4` | Perorangan | Keluarga Siti Rahayu | Default prefilled individual household (`Blok B4`, `MANDIRI`) |
| `warga-c3` | Perorangan | Keluarga Dewi Lestari | Individual household (`Blok C3`, `MANDIRI`) |
| `pos-rw04` | Pengelola | Pak Hendra Wijaya | Default prefilled coordinator (`Pos Bank Sampah RW 04`) |
| `admin-01` | Pengelola | Bu Rina Kusuma | Coordinator (`Pos Induk Kelurahan`) |

The seed dataset also includes 3 pos-managed houses (`KELOLAAN_POS`: `Blok A1`, `Blok A2`, `Blok D5`) ready for testing multi-house batch accumulation immediately on login.

---

## Tech Stack & Web Platform APIs

- **Frontend**: React 19, TypeScript 5.8, Vite 6
- **Typography**: Self-hosted `@fontsource/space-grotesk`, `@fontsource/plus-jakarta-sans`, and `@fontsource/jetbrains-mono`
- **Hardware & Browser APIs**:
  - Service Worker (`public/sw.js`) + Web App Manifest (`public/manifest.webmanifest`)
  - MediaDevices camera capture, canvas motion stabilization, and `BarcodeDetector` QR scanning
  - Screen Wake Lock API (`useWakeLock`)
  - Web Bluetooth API (`bleScale.ts`) for ESP32 + HX711 scale streams
  - Web Speech Synthesis & Web Audio API (`audioSynth.ts`)
  - Persistent client storage via `localStorage`

---

## Project Structure

```text
sorta/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── vite.config.ts
├── public/
│   ├── icon.svg
│   ├── manifest.webmanifest
│   └── sw.js
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── components/
    │   ├── AuthLoginScreen.tsx
    │   ├── CitizenDetailDialog.tsx
    │   ├── DiagnosticsView.tsx
    │   ├── HomeDashboardView.tsx
    │   ├── Icons.tsx
    │   ├── KioskView.tsx
    │   ├── LedgerView.tsx
    │   ├── PayoutDialog.tsx
    │   ├── ProfileView.tsx
    │   ├── QrCitizenDialog.tsx
    │   ├── RegisterCitizenDialog.tsx
    │   └── TopTelemetryBar.tsx
    ├── data/
    │   ├── catalog.ts
    │   ├── gamification.ts
    │   └── seed.ts
    ├── hooks/
    │   ├── useCountUp.ts
    │   ├── usePersistentState.ts
    │   └── useWakeLock.ts
    ├── services/
    │   ├── audioSynth.ts
    │   ├── bleScale.ts
    │   ├── geminiVision.ts
    │   ├── motionDetector.ts
    │   └── qrScanner.ts
    ├── styles/
    │   ├── tokens.css
    │   ├── base.css
    │   ├── kiosk.css
    │   ├── ledger.css
    │   ├── diagnostics.css
    │   └── dialogs.css
    └── types/
        └── sorta.ts
```

---

## Local Development

Requires **Node.js** and **pnpm**.

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Type-check and create production build
pnpm build

# Preview production bundle locally
pnpm preview
```
