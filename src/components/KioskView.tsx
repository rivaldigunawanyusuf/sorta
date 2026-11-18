import { useRef, useState } from 'react';
import {
  calculatePayoutIdr,
  formatIdr,
  getCatalogItem,
} from '../data/catalog';
import {
  computeNextStreak,
  computeSortPoints,
  getCitizenDailyMissions,
  getLevelProgress,
  getLocalDateKey,
} from '../data/gamification';
import type {
  AuthSession,
  BinPosition,
  BinState,
  BleConnectionStatus,
  CitizenAccount,
  MaterialCatalogItem,
  MaterialCode,
  TransactionRecord,
  WasteClassificationResult,
  WeightSensorMode,
} from '../types/sorta';
import {
  CameraLensIcon,
  CheckBadgeIcon,
  DownArrowKinetic,
  QrCodeIcon,
  SampleSilhouette,
  ScaleIcon,
  StreakBoltIcon,
  TrophyIcon,
  UploadPhotoIcon,
  UserPlusIcon,
  UsersGroupIcon,
} from './Icons';

interface KioskViewProps {
  session: AuthSession;
  isDesktop: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraLoading: boolean;
  cameraError: string | null;
  torchSupported: boolean;
  torchOn: boolean;
  onToggleCamera: () => void;
  onToggleTorch: () => void;
  onManualFrameScan: () => void;
  onUploadPhotoFile: (file: File) => void;
  onClassifyManualMaterial: (code: MaterialCode) => void;
  motionScore: number;
  motionThreshold: number;
  motionPhase: 'IDLE' | 'STABILIZING' | 'SCANNING' | 'LOCKED';
  isScanning: boolean;
  scanWarning: string | null;
  activeResult: WasteClassificationResult | null;
  catalog: MaterialCatalogItem[];
  sensorMode: WeightSensorMode;
  overrideWeightGrams: number;
  onChangeManualWeight: (grams: number) => void;
  onResetToAiWeight: () => void;
  bleStatus: BleConnectionStatus;
  bleLiveGrams: number;
  onConnectBle: () => void;
  autoCommitSecondsLeft: number | null;
  autoCommitPaused: boolean;
  onToggleAutoCommitPause: () => void;
  onCommitClassification: () => void;
  onCancelClassification: () => void;
  bins: Record<BinPosition, BinState>;
  onInspectBin: (pos: BinPosition) => void;
  citizens: CitizenAccount[];
  activeCitizen: CitizenAccount;
  onSelectActiveCitizen: (id: string) => void;
  onOpenQrDialog: () => void;
  onOpenRegisterCitizen: () => void;
  accumulationMode: 'SINGLE' | 'MULTI';
  onChangeAccumulationMode: (mode: 'SINGLE' | 'MULTI') => void;
  batchCitizenIds: string[];
  onToggleBatchCitizen: (id: string) => void;
  onSelectAllNonMandiri: () => void;
  transactions: TransactionRecord[];
  lastCommitToast: string | null;
}

const BIN_ORDER: BinPosition[] = ['LEFT', 'CENTER', 'RIGHT'];

export function KioskView({
  session,
  isDesktop,
  videoRef,
  cameraActive,
  cameraLoading,
  cameraError,
  torchSupported,
  torchOn,
  onToggleCamera,
  onToggleTorch,
  onManualFrameScan,
  onUploadPhotoFile,
  onClassifyManualMaterial,
  motionScore,
  motionThreshold,
  motionPhase,
  isScanning,
  scanWarning,
  activeResult,
  catalog,
  sensorMode,
  overrideWeightGrams,
  onChangeManualWeight,
  onResetToAiWeight,
  bleStatus,
  bleLiveGrams,
  onConnectBle,
  autoCommitSecondsLeft,
  autoCommitPaused,
  onToggleAutoCommitPause,
  onCommitClassification,
  onCancelClassification,
  bins,
  onInspectBin,
  citizens,
  activeCitizen,
  onSelectActiveCitizen,
  onOpenQrDialog,
  onOpenRegisterCitizen,
  accumulationMode,
  onChangeAccumulationMode,
  batchCitizenIds,
  onToggleBatchCitizen,
  onSelectAllNonMandiri,
  transactions,
  lastCommitToast,
}: KioskViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualMaterialCode, setManualMaterialCode] = useState<MaterialCode>(
    catalog[0]?.code ?? 'PET_CLEAR',
  );
  const [mobileDeckExpanded, setMobileDeckExpanded] = useState(false);

  const isManager = session.role === 'PENGELOLA';
  const housePool = citizens.filter((c) => !c.isCommunityPool);
  const effectiveBatchCount =
    isManager && accumulationMode === 'MULTI' && batchCitizenIds.length > 0
      ? batchCitizenIds.length
      : 1;

  const effectiveWeightGrams =
    sensorMode === 'BLE_LOAD_CELL' && bleStatus === 'CONNECTED'
      ? Math.max(0, bleLiveGrams)
      : sensorMode === 'MANUAL_SCALE'
        ? overrideWeightGrams
        : (activeResult?.estimated_weight_grams ?? overrideWeightGrams);

  const activeCatalogItem = activeResult
    ? getCatalogItem(catalog, activeResult.material_code)
    : null;
  const activePricePerKg = activeCatalogItem
    ? activeCatalogItem.pricePerKgIdr
    : (activeResult?.price_per_kg_idr ?? 0);
  const livePayoutIdr = activeResult
    ? calculatePayoutIdr(effectiveWeightGrams, activePricePerKg)
    : 0;

  const perHouseWeightGrams = Math.max(1, Math.round(effectiveWeightGrams / effectiveBatchCount));
  const perHousePayoutIdr =
    effectiveBatchCount > 1 ? Math.round(livePayoutIdr / effectiveBatchCount) : livePayoutIdr;

  const todayKey = getLocalDateKey();
  const projectedStreak = computeNextStreak(
    activeCitizen.lastSortedDate,
    activeCitizen.streakDays,
    todayKey,
  );
  const previewPoints = activeResult
    ? computeSortPoints(
        activeResult.bin_position,
        perHouseWeightGrams,
        activeResult.cleanliness_grade,
        projectedStreak,
      )
    : 0;

  const levelInfo = getLevelProgress(activeCitizen.ecoPoints);
  const dailyMissions = getCitizenDailyMissions(activeCitizen, transactions, todayKey);
  const completedMissionsCount = dailyMissions.filter((m) => m.completed).length;

  const motionStatusLabel =
    isScanning || motionPhase === 'SCANNING'
      ? 'Menganalisis...'
      : motionPhase === 'STABILIZING'
        ? 'Menstabilkan...'
        : activeResult
          ? isDesktop
            ? 'Teridentifikasi'
            : 'Terdeteksi'
          : cameraActive
            ? 'Sensor Siaga'
            : isDesktop
              ? 'Kamera Siap'
              : 'Siaga';

  const sensorSourceLabel =
    bleStatus === 'CONNECTED' && sensorMode === 'BLE_LOAD_CELL'
      ? 'Timbangan BLE'
      : sensorMode === 'MANUAL_SCALE'
        ? 'Input Timbangan'
        : 'Estimasi Visual';

  const targetSummaryText =
    isManager && accumulationMode === 'MULTI'
      ? batchCitizenIds.length > 0
        ? `Akumulasi ${batchCitizenIds.length} Rumah`
        : 'Pilih rumah untuk akumulasi'
      : activeCitizen.name;

  return (
    <div className="kiosk-stage">
      <h1 className="visually-hidden">SORTA Kamera Pemindai dan Valuasi Sampah</h1>

      {/* Role-Aware Deposit Target Bar (Pengelola 1 Rumah / Multi-Rumah vs Perorangan Terkunci) */}
      <section className="target-bar-card oneui-card" aria-label="Target Pencatatan Setoran">
        {isManager ? (
          <div className="manager-target-bar">
            <div className="manager-mode-row">
              <div className="target-mode-segmented" role="group" aria-label="Mode Penyetoran">
                <button
                  type="button"
                  className={`target-mode-pill ${accumulationMode === 'SINGLE' ? 'is-active' : ''}`}
                  onClick={() => onChangeAccumulationMode('SINGLE')}
                >
                  1 Rumah
                </button>
                <button
                  type="button"
                  className={`target-mode-pill ${accumulationMode === 'MULTI' ? 'is-active' : ''}`}
                  onClick={() => onChangeAccumulationMode('MULTI')}
                >
                  <UsersGroupIcon />
                  <span>Akumulasi Multi-Rumah</span>
                </button>
              </div>

              <div className="manager-target-actions">
                {accumulationMode === 'SINGLE' ? (
                  <>
                    <label htmlFor="camera-citizen-select" className="visually-hidden">
                      Pilih Rumah Penyetor
                    </label>
                    <select
                      id="camera-citizen-select"
                      className="camera-citizen-select"
                      value={activeCitizen.id}
                      onChange={(e) => onSelectActiveCitizen(e.target.value)}
                    >
                      {citizens.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.blockCode})
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn-hud" onClick={onOpenQrDialog}>
                      <QrCodeIcon />
                      <span>QR</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-hud"
                      onClick={onSelectAllNonMandiri}
                    >
                      Pilih Non-Mandiri
                    </button>
                    <button type="button" className="btn-hud" onClick={onOpenRegisterCitizen}>
                      <UserPlusIcon />
                      <span>Tambah Rumah</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {accumulationMode === 'MULTI' && (
              <div className="batch-house-strip">
                {housePool.length === 0 ? (
                  <p className="batch-empty-hint">
                    Belum ada rumah warga terdaftar. Klik <strong>Tambah Rumah</strong> untuk mulai
                    mengakumulasi beberapa rumah sekaligus.
                  </p>
                ) : (
                  <div className="batch-chips-wrap">
                    {housePool.map((house) => {
                      const isChecked = batchCitizenIds.includes(house.id);
                      const isManaged = house.sortingMode === 'KELOLAAN_POS';
                      return (
                        <label
                          key={house.id}
                          className={`batch-house-chip ${isChecked ? 'is-checked' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleBatchCitizen(house.id)}
                          />
                          <span>
                            {house.name} · {house.blockCode}
                          </span>
                          {isManaged && <em className="batch-nonmandiri-dot">Pos</em>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="individual-target-bar">
            <div className="individual-target-info">
              <span className="role-pill is-perorangan">Pilah Mandiri</span>
              <strong>
                {activeCitizen.name} ({activeCitizen.blockCode})
              </strong>
            </div>
            <div className="individual-target-stats tabular-nums">
              <span className="hud-points-pill">
                Lv.{levelInfo.currentTier.level} · {activeCitizen.ecoPoints} Poin
              </span>
              <strong className="accent-emerald">{formatIdr(activeCitizen.balanceIdr)}</strong>
            </div>
          </div>
        )}
      </section>

      {/* ZONE B: CAMERA VIEWFINDER & GAMIFICATION / POS DECK */}
      <section className="zone-viewfinder" aria-label="Area Kamera Pemindai dan Valuasi">
        <div className="viewfinder-panel">
          <div
            className={`optical-viewport ${isScanning ? 'is-scanning' : ''} ${
              cameraActive ? 'is-live-cam' : ''
            } ${activeResult ? 'has-result' : ''}`}
          >
            <video
              ref={videoRef}
              className={`camera-video ${cameraActive ? 'is-visible' : 'is-hidden'}`}
              autoPlay
              playsInline
              muted
              width={640}
              height={360}
            />

            {cameraActive && (
              <div className="reticle-overlay" aria-hidden="true">
                <span className="reticle-corner tl" />
                <span className="reticle-corner tr" />
                <span className="reticle-corner bl" />
                <span className="reticle-corner br" />
                {isScanning && <span className="laser-scan-line" />}
              </div>
            )}

            <div className="viewfinder-top-hud">
              <div className="motion-telemetry">
                <span className="motion-label">{motionStatusLabel}</span>
                {cameraActive && (
                  <>
                    <div className="motion-bar-track" aria-hidden="true">
                      <div
                        className="motion-bar-fill"
                        style={{ width: `${Math.min(100, motionScore)}%` }}
                      />
                      <span
                        className="motion-threshold-pin"
                        style={{ left: `${Math.min(98, motionThreshold)}%` }}
                      />
                    </div>
                    <span className="motion-pct tabular-nums">{motionScore}%</span>
                  </>
                )}
              </div>

              <div className="viewfinder-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="visually-hidden"
                  aria-label="Unggah atau ambil foto sampah"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      onUploadPhotoFile(f);
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="btn-hud"
                  disabled={isScanning}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadPhotoIcon />
                  <span>{isDesktop ? 'Unggah Foto' : 'Foto'}</span>
                </button>
                <button
                  type="button"
                  className="btn-hud"
                  onClick={onToggleCamera}
                  disabled={cameraLoading}
                >
                  <CameraLensIcon />
                  <span>{cameraActive ? 'Matikan' : 'Buka Kamera'}</span>
                </button>
                {cameraActive && (
                  <button
                    type="button"
                    className="btn-commit btn-hud-compact"
                    onClick={onManualFrameScan}
                    disabled={isScanning}
                  >
                    <span>{isScanning ? 'Memindai...' : 'Scan Frame'}</span>
                  </button>
                )}
                {cameraActive && torchSupported && (
                  <button
                    type="button"
                    className={`btn-hud ${torchOn ? 'is-active' : ''}`}
                    aria-pressed={torchOn}
                    onClick={onToggleTorch}
                  >
                    <span>{torchOn ? 'Flash On' : 'Flash'}</span>
                  </button>
                )}
              </div>
            </div>

            {!cameraActive && !activeResult && (
              <div className="simulation-canvas" aria-live="polite">
                {cameraLoading ? (
                  <div className="sim-standby-state">
                    <span className="standby-pill">Menghubungkan Kamera</span>
                    <p>Meminta izin kamera belakang perangkat untuk pemindaian langsung.</p>
                  </div>
                ) : (
                  <div className="sim-standby-state">
                    <span className="standby-pill">Pemindai Siap</span>
                    <h2>Pindai Sampah untuk Mulai</h2>
                    <p>
                      Arahkan kamera ke sampah atau unggah foto untuk klasifikasi ke 3 tong secara
                      otomatis.
                    </p>
                    <div className="standby-cta-pair">
                      <button type="button" className="btn-commit" onClick={onToggleCamera}>
                        <CameraLensIcon />
                        <span>Buka Kamera</span>
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadPhotoIcon />
                        <span>Unggah Foto</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {cameraError && (
              <div className="viewfinder-alert is-error" role="alert">
                <div>
                  <strong>Kamera tidak tersedia:</strong> {cameraError}
                </div>
                <button type="button" className="btn-hud" onClick={onToggleCamera}>
                  Coba Lagi
                </button>
              </div>
            )}

            {!cameraError && scanWarning && !activeResult && (
              <div className="viewfinder-alert" role="status">
                <span>{scanWarning}</span>
              </div>
            )}

            {lastCommitToast && !activeResult && (
              <div className="commit-toast" role="status" aria-live="polite">
                {lastCommitToast}
              </div>
            )}

            {activeResult && (
              <article
                className={`valuation-hud bin-${activeResult.bin_position.toLowerCase()} ${
                  cameraActive ? 'is-docked' : 'is-centered'
                }`}
                aria-label="Hasil Klasifikasi dan Valuasi Sampah"
                aria-live="polite"
              >
                <div className="hud-header-row">
                  <div className="hud-title-cluster">
                    {activeCatalogItem && (
                      <div className="hud-emblem" aria-hidden="true">
                        <SampleSilhouette
                          silhouette={activeCatalogItem.silhouette}
                          className="hud-emblem-svg"
                        />
                      </div>
                    )}
                    <div>
                      <span className="hud-code">
                        <code>{activeResult.material_code}</code> ·{' '}
                        {activeResult.cleanliness_grade === 'A'
                          ? 'Grade A (Bersih)'
                          : activeResult.cleanliness_grade === 'B'
                            ? 'Grade B (Organik)'
                            : 'Grade C (Residu)'}
                      </span>
                      <h2 className="hud-title">{activeResult.item_name}</h2>
                    </div>
                  </div>
                  <div className="hud-confidence-group">
                    <span className="hud-source-tag">
                      {activeResult.source === 'GEMINI_VISION'
                        ? 'Kamera Cloud'
                        : activeResult.source === 'LOCAL_CLASSIFIER'
                          ? 'Visual Lokal'
                          : 'Input Manual'}
                    </span>
                    <span className="hud-confidence tabular-nums">
                      {(activeResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="hud-math-row">
                  <div className="hud-formula-box">
                    <div className="hud-formula-line tabular-nums">
                      <span>{formatIdr(activePricePerKg)}/kg</span>
                      <span aria-hidden="true">×</span>
                      <span>{effectiveWeightGrams} g</span>
                      <span className="hud-weight-kg">
                        ({(effectiveWeightGrams / 1000).toFixed(3)} kg)
                      </span>
                    </div>
                    {effectiveBatchCount > 1 ? (
                      <p className="hud-tip tabular-nums">
                        Dibagi ke {effectiveBatchCount} rumah (@{perHouseWeightGrams} g · +
                        {formatIdr(perHousePayoutIdr)} &amp; +{previewPoints} poin/rumah)
                      </p>
                    ) : (
                      <p className="hud-tip">{activeResult.recycling_tip}</p>
                    )}
                  </div>

                  <div className="hud-payout-box">
                    <span className="section-kicker">{targetSummaryText}</span>
                    <strong className="hud-payout-value tabular-nums">
                      {livePayoutIdr > 0 ? `+ ${formatIdr(livePayoutIdr)}` : 'Rp 0 (Residu)'}
                    </strong>
                    <span className="hud-points-pill tabular-nums">
                      +{previewPoints} Poin {effectiveBatchCount > 1 ? '/ rumah' : 'Hijau'}
                    </span>
                  </div>
                </div>

                <div className="hud-footer-actions">
                  <div className="hud-countdown-wrap">
                    <div className="hud-countdown-label">
                      <span className="tabular-nums">
                        {autoCommitPaused
                          ? 'Auto-catat dijeda'
                          : autoCommitSecondsLeft !== null
                            ? `Catat otomatis ${autoCommitSecondsLeft.toFixed(1)}d`
                            : 'Siap dicatat ke tong'}
                      </span>
                      <button
                        type="button"
                        className="btn-hud-small"
                        onClick={onToggleAutoCommitPause}
                      >
                        {autoCommitPaused ? 'Lanjut' : 'Jeda'}
                      </button>
                    </div>
                    <div className="hud-progress-track" aria-hidden="true">
                      <div
                        className="hud-progress-fill"
                        style={{
                          width: `${
                            autoCommitSecondsLeft !== null
                              ? Math.max(0, Math.min(100, (autoCommitSecondsLeft / 3) * 100))
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="hud-buttons-pair">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={onCancelClassification}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn-commit"
                      onClick={onCommitClassification}
                    >
                      {effectiveBatchCount > 1
                        ? `Akumulasi ke ${effectiveBatchCount} Rumah`
                        : 'Catat & Tambah Saldo'}
                    </button>
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>

        {/* Right Panel: Gamification Progress + Actual Weight / Manual Input */}
        <aside className="control-deck" aria-label="Panel Penimbangan dan Progres Gamifikasi">
          {!isDesktop && (
            <div className="mobile-deck-summary">
              <div className="mobile-gamify-mini">
                <TrophyIcon />
                <span className="tabular-nums">
                  Lv.{levelInfo.currentTier.level} · {activeCitizen.ecoPoints} Poin
                </span>
                <span className="mobile-mission-count tabular-nums">
                  Misi {completedMissionsCount}/{dailyMissions.length}
                </span>
              </div>
              <button
                type="button"
                className="btn-hud"
                aria-expanded={mobileDeckExpanded}
                aria-controls="production-kiosk-deck"
                onClick={() => setMobileDeckExpanded((prev) => !prev)}
              >
                {mobileDeckExpanded ? 'Tutup Panel' : 'Manual & Misi'}
              </button>
            </div>
          )}

          {(isDesktop || mobileDeckExpanded) && (
            <div id="production-kiosk-deck" className="production-deck-content">
              <div className="gamify-card">
                {isManager && accumulationMode === 'MULTI' ? (
                  <div className="gamify-header">
                    <div className="gamify-tier-title">
                      <span className="section-kicker">
                        <UsersGroupIcon /> Mode Pengelola Pos
                      </span>
                      <strong>
                        {batchCitizenIds.length > 0
                          ? `Akumulasi ${batchCitizenIds.length} Rumah Aktif`
                          : 'Pilih Rumah Non-Mandiri'}
                      </strong>
                    </div>
                    <span className="role-pill is-pengelola tabular-nums">
                      {housePool.filter((h) => h.sortingMode === 'KELOLAAN_POS').length} Non-Mandiri
                    </span>
                  </div>
                ) : (
                  <div className="gamify-header">
                    <div className="gamify-tier-title">
                      <span className="section-kicker">
                        <TrophyIcon /> Progres {activeCitizen.name}
                      </span>
                      <strong>
                        Lv. {levelInfo.currentTier.level} · {levelInfo.currentTier.title}
                      </strong>
                    </div>
                    <div className="streak-badge tabular-nums">
                      <StreakBoltIcon />
                      <span>{activeCitizen.streakDays} Hari Streak</span>
                    </div>
                  </div>
                )}

                <div className="xp-bar-block">
                  <div className="xp-bar-meta tabular-nums">
                    <strong>{activeCitizen.ecoPoints} Poin Hijau</strong>
                    <span>
                      {levelInfo.nextTier
                        ? `${levelInfo.pointsToNext} poin ke ${levelInfo.nextTier.title}`
                        : 'Level Tertinggi'}
                    </span>
                  </div>
                  <div className="xp-progress-track" aria-hidden="true">
                    <div
                      className="xp-progress-fill"
                      style={{ width: `${levelInfo.progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="mission-list">
                  {dailyMissions.map((mission) => (
                    <div
                      key={mission.id}
                      className={`mission-row ${mission.completed ? 'is-completed' : ''}`}
                    >
                      <div className="mission-info">
                        <CheckBadgeIcon className="mission-check-icon" />
                        <span className="mission-title">{mission.title}</span>
                      </div>
                      <div className="mission-meta tabular-nums">
                        <span className="mission-counter">
                          {mission.current}/{mission.target}
                        </span>
                        <span className="mission-reward">+{mission.rewardPoints}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pos-input-section">
                <div className="deck-section-head">
                  <label htmlFor="kiosk-weight-number" className="section-kicker">
                    <ScaleIcon /> Timbangan &amp; Input Manual
                  </label>
                  <button
                    type="button"
                    className={`ble-mini-btn ${bleStatus === 'CONNECTED' ? 'is-connected' : ''}`}
                    onClick={onConnectBle}
                  >
                    {bleStatus === 'CONNECTED'
                      ? 'BLE Terhubung'
                      : bleStatus === 'CONNECTING'
                        ? 'Menghubungkan...'
                        : 'Hubungkan BLE'}
                  </button>
                </div>

                <div className="pos-weight-row">
                  <div className="pos-weight-field">
                    <input
                      id="kiosk-weight-number"
                      type="number"
                      min={1}
                      max={50000}
                      step={1}
                      className="pos-num-input tabular-nums"
                      aria-label="Berat aktual sampah dalam gram"
                      value={effectiveWeightGrams}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(50000, Number(e.target.value) || 1));
                        onChangeManualWeight(val);
                      }}
                    />
                    <span className="pos-unit-tag">
                      gram ({(effectiveWeightGrams / 1000).toFixed(3)} kg)
                    </span>
                  </div>
                  <div className="weight-mode-tag">
                    <span>{sensorSourceLabel}</span>
                    {sensorMode === 'MANUAL_SCALE' && (
                      <button
                        type="button"
                        className="text-action-btn"
                        onClick={onResetToAiWeight}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="manual-material-row">
                  <label htmlFor="manual-material-select" className="visually-hidden">
                    Pilih jenis material sampah secara manual
                  </label>
                  <select
                    id="manual-material-select"
                    className="manual-material-select"
                    value={manualMaterialCode}
                    onChange={(e) => setManualMaterialCode(e.target.value as MaterialCode)}
                  >
                    {catalog.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary manual-entry-btn"
                    onClick={() => onClassifyManualMaterial(manualMaterialCode)}
                  >
                    Arahkan
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>

      {/* ZONE C: 3 PHYSICAL BIN CARDS */}
      <section className="zone-bins" aria-label="Pilar Arah 3 Tong Sampah Fisik">
        {BIN_ORDER.map((pos) => {
          const bin = bins[pos];
          const hasSelection = activeResult !== null;
          const isTarget = activeResult?.bin_position === pos;
          const isDimmed = hasSelection && !isTarget;
          const fillPct = Math.min(100, Math.round((bin.totalWeightKg / bin.capacityKg) * 100));
          const colorClass =
            pos === 'LEFT' ? 'bin-emerald' : pos === 'CENTER' ? 'bin-amber' : 'bin-crimson';
          const shortPos = isDesktop
            ? pos === 'LEFT'
              ? 'Tong Kiri'
              : pos === 'CENTER'
                ? 'Tong Tengah'
                : 'Tong Kanan'
            : pos === 'LEFT'
              ? 'Kiri'
              : pos === 'CENTER'
                ? 'Tengah'
                : 'Kanan';
          const titleDisplay =
            pos === 'LEFT'
              ? 'Organik'
              : pos === 'CENTER'
                ? isDesktop
                  ? 'Anorganik Bernilai'
                  : 'Anorganik'
                : 'Residu';

          return (
            <button
              key={pos}
              type="button"
              className={`bin-pillar ${colorClass} ${isTarget ? 'is-active-target' : ''} ${
                isDimmed ? 'is-dimmed' : ''
              }`}
              aria-pressed={isTarget}
              onClick={() => onInspectBin(pos)}
            >
              <div className="bin-pillar-top">
                <div className="bin-code-row">
                  <span className="bin-position-code">{shortPos}</span>
                  {pos === 'CENTER' && isDesktop && (
                    <span className="bin-cash-badge">Bernilai Tunai</span>
                  )}
                </div>
                <h2 className="bin-title">{titleDisplay}</h2>
                <span className="bin-subtitle">{bin.categoryLabel}</span>
              </div>

              <div className="bin-guidance-center">
                {isTarget ? (
                  <>
                    <span className="drop-signal-badge">
                      {isDesktop ? 'Masukkan ke Sini' : 'Masuk Sini'}
                    </span>
                    <DownArrowKinetic className="kinetic-down-arrow" />
                  </>
                ) : (
                  <div className="bin-idle-metrics tabular-nums">
                    <span className="bin-weight-value">{bin.totalWeightKg.toFixed(2)} kg</span>
                    <span className="bin-count-label">{bin.itemCount} item</span>
                  </div>
                )}
              </div>

              <div className="bin-pillar-footer">
                <div className="bin-capacity-row tabular-nums">
                  <span>Isi {fillPct}%</span>
                  <span>
                    {bin.totalWeightKg.toFixed(2)} / {bin.capacityKg} kg
                  </span>
                </div>
                <div className="bin-capacity-track" aria-hidden="true">
                  <div className="bin-capacity-fill" style={{ width: `${fillPct}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
