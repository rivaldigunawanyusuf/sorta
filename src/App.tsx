import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthLoginScreen } from './components/AuthLoginScreen';
import { DiagnosticsView, type ThemePreference } from './components/DiagnosticsView';
import { HomeDashboardView } from './components/HomeDashboardView';
import {
  CameraLensIcon,
  DeviceNavIcon,
  HomeNavIcon,
  LedgerNavIcon,
  ProfileNavIcon,
} from './components/Icons';
import { KioskView } from './components/KioskView';
import { LedgerView } from './components/LedgerView';
import { PayoutDialog } from './components/PayoutDialog';
import { ProfileView } from './components/ProfileView';
import { QrCitizenDialog } from './components/QrCitizenDialog';
import { RegisterCitizenDialog } from './components/RegisterCitizenDialog';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import {
  binLabelIndonesian,
  calculatePayoutIdr,
  createHouseAccount,
  formatIdr,
  getCatalogItem,
  INITIAL_MATERIAL_CATALOG,
} from './data/catalog';
import {
  createSeedBins,
  createSeedCitizens,
  createSeedTransactions,
  createSeedWithdrawals,
} from './data/seed';
import {
  computeNextStreak,
  computeSortPoints,
  evaluateUnlockedBadges,
  getCitizenDailyMissions,
  getLevelProgress,
  getLocalDateKey,
  isPlasticMaterial,
} from './data/gamification';
import { usePersistentState } from './hooks/usePersistentState';
import { useWakeLock } from './hooks/useWakeLock';
import {
  playClassificationCue,
  playCommitSuccessChime,
  playScanLockBeep,
  playTactileClick,
  speakInstructionId,
  stopSpeechGuidance,
} from './services/audioSynth';
import { type BleScaleSession, connectEsp32BleScale } from './services/bleScale';
import {
  analyzeSnapshotWithVision,
  captureVideoSnapshotDataUrl,
  readImageFileAsDataUrl,
} from './services/geminiVision';
import { compareMotionFrames, computeFrameLuma } from './services/motionDetector';
import type {
  AppView,
  AuthSession,
  BinPosition,
  BinState,
  BleChannelWeights,
  BleConnectionStatus,
  CitizenAccount,
  HouseSortingMode,
  MaterialCatalogItem,
  MaterialCode,
  PayoutChannel,
  SeedUserAccount,
  TransactionRecord,
  UserRole,
  WasteClassificationResult,
  WeightSensorMode,
  WithdrawalRecord,
} from './types/sorta';

const VIEW_TITLES: Record<AppView, string> = {
  home: 'Home | SORTA',
  ledger: 'Bank Sampah | SORTA',
  camera: 'Kamera Pindai | SORTA',
  devices: 'Perangkat | SORTA',
  profile: 'Profil | SORTA',
};

function readInitialTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem('sorta.colorScheme.v1');
    if (saved === 'light' || saved === 'dark' || saved === 'light dark') {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }
  return 'light';
}

function readInitialView(): AppView {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace('#', '');
  if (
    hash === 'home' ||
    hash === 'ledger' ||
    hash === 'camera' ||
    hash === 'devices' ||
    hash === 'profile'
  ) {
    return hash;
  }
  return 'home';
}

export function App() {
  const [activeView, setActiveView] = useState<AppView>(readInitialView);
  const [themePreference, setThemePreference] = useState<ThemePreference>(readInitialTheme);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 960px)').matches : true,
  );

  // Auth Session state (null triggers prefilled Seed Login screen on fresh entry)
  const [authSession, setAuthSession] = usePersistentState<AuthSession | null>(
    'sorta.authSession.v5',
    null,
  );

  useEffect(() => {
    const metaScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaScheme) {
      metaScheme.setAttribute('content', themePreference);
    }
    const isResolvedDark =
      themePreference === 'dark' ||
      (themePreference === 'light dark' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isResolvedDark ? '#0E1014' : '#F2F4F7');
    }
    try {
      window.localStorage.setItem('sorta.colorScheme.v1', themePreference);
    } catch {
      // Ignore storage access errors
    }
  }, [themePreference]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'sorta.colorScheme.v1' &&
        (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'light dark')
      ) {
        setThemePreference(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 960px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Seeded production persistent state ready for role testing
  const [catalog, setCatalog] = usePersistentState<MaterialCatalogItem[]>(
    'sorta.catalog.v5',
    INITIAL_MATERIAL_CATALOG,
  );
  const [citizens, setCitizens] = usePersistentState<CitizenAccount[]>(
    'sorta.citizens.v5',
    createSeedCitizens,
  );
  const [activeCitizenId, setActiveCitizenId] = usePersistentState<string>(
    'sorta.activeCitizenId.v5',
    'ctz-seed-b4',
  );
  const [transactions, setTransactions] = usePersistentState<TransactionRecord[]>(
    'sorta.transactions.v5',
    createSeedTransactions,
  );
  const [withdrawals, setWithdrawals] = usePersistentState<WithdrawalRecord[]>(
    'sorta.withdrawals.v5',
    createSeedWithdrawals,
  );
  const [bins, setBins] = usePersistentState<Record<BinPosition, BinState>>(
    'sorta.bins.v5',
    createSeedBins,
  );
  const [geminiApiKey, setGeminiApiKey] = usePersistentState<string>(
    'sorta.geminiKey.v2',
    '',
  );
  const [ttsEnabled, setTtsEnabled] = usePersistentState<boolean>('sorta.tts.v2', true);
  const [motionSensitivity, setMotionSensitivity] = usePersistentState<number>(
    'sorta.motionSensitivity.v2',
    18,
  );
  const [autoScanOnMotion, setAutoScanOnMotion] = usePersistentState<boolean>(
    'sorta.autoScanMotion.v2',
    true,
  );
  const [autoCommitEnabled, setAutoCommitEnabled] = usePersistentState<boolean>(
    'sorta.autoCommit.v2',
    true,
  );

  // Manager multi-house accumulation state
  const [accumulationMode, setAccumulationMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [batchCitizenIds, setBatchCitizenIds] = useState<string[]>(() =>
    citizens
      .filter((c) => !c.isCommunityPool && c.sortingMode === 'KELOLAAN_POS')
      .map((c) => c.id),
  );

  // Camera & motion detection runtime state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionScratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumaRef = useRef<Uint8ClampedArray | null>(null);
  const motionCooldownUntilRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStreamState, setCameraStreamState] = useState<MediaStream | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [motionScore, setMotionScore] = useState(0);
  const [motionPhase, setMotionPhase] = useState<'IDLE' | 'STABILIZING' | 'SCANNING' | 'LOCKED'>(
    'IDLE',
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanWarning, setScanWarning] = useState<string | null>(null);

  // Classification, weight HAL & commit countdown state
  const [activeResult, setActiveResult] = useState<WasteClassificationResult | null>(null);
  const [lastClassification, setLastClassification] = useState<WasteClassificationResult | null>(
    null,
  );
  const [sensorMode, setSensorMode] = useState<WeightSensorMode>('AI_VISUAL');
  const [overrideWeightGrams, setOverrideWeightGrams] = useState<number>(22);
  const [autoCommitSecondsLeft, setAutoCommitSecondsLeft] = useState<number | null>(null);
  const [autoCommitPaused, setAutoCommitPaused] = useState(false);
  const [lastCommitToast, setLastCommitToast] = useState<string | null>(null);

  // BLE IoT Load Cell state
  const bleSessionRef = useRef<BleScaleSession | null>(null);
  const [bleStatus, setBleStatus] = useState<BleConnectionStatus>('DISCONNECTED');
  const [bleMessage, setBleMessage] = useState(
    'Siap pairing ke timbangan digital ESP32 HX711 via Web Bluetooth, atau gunakan input timbangan manual.',
  );
  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);
  const [bleChannels, setBleChannels] = useState<BleChannelWeights>({
    leftGrams: 0,
    centerGrams: 0,
    rightGrams: 0,
    activeGrams: 0,
  });

  // Dialog & fullscreen state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [payoutTargetCitizen, setPayoutTargetCitizen] = useState<CitizenAccount | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { wakeLockStatus, toggleWakeLock } = useWakeLock(true);

  const resolvedActiveCitizenId =
    authSession?.role === 'PERORANGAN' && authSession.citizenId
      ? authSession.citizenId
      : activeCitizenId;

  const activeCitizen =
    citizens.find((c) => c.id === resolvedActiveCitizenId) ?? citizens[0];

  useEffect(() => {
    document.title = authSession ? VIEW_TITLES[activeView] : 'Masuk | SORTA';
    if (window.location.hash !== `#${activeView}`) {
      window.history.replaceState(null, '', `#${activeView}`);
    }
  }, [activeView, authSession]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveView(readInitialView());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    prevLumaRef.current = null;
    setCameraStreamState(null);
    setCameraActive(false);
    setTorchSupported(false);
    setTorchOn(false);
    setMotionScore(0);
    setMotionPhase('IDLE');
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Browser tidak mendukung kamera langsung. Gunakan Unggah Foto atau Input Manual.',
      );
      return;
    }

    setCameraLoading(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraStreamState(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      const [videoTrack] = stream.getVideoTracks();
      const caps = videoTrack?.getCapabilities?.() as { torch?: boolean } | undefined;
      setTorchSupported(Boolean(caps?.torch));
      setCameraActive(true);
      setMotionPhase('IDLE');
      playTactileClick(ttsEnabled);
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : 'Izin kamera ditolak atau perangkat tidak ditemukan.';
      setCameraError(`${reason} Gunakan Unggah Foto atau Input Manual.`);
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  }, [ttsEnabled]);

  const handleToggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
      playTactileClick(ttsEnabled);
    } else {
      void startCamera();
    }
  }, [cameraActive, startCamera, stopCamera, ttsEnabled]);

  const handleToggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
      playTactileClick(ttsEnabled);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn, ttsEnabled]);

  useEffect(() => {
    return () => {
      stopCamera();
      bleSessionRef.current?.disconnect();
    };
  }, [stopCamera]);

  const presentClassificationResult = useCallback(
    (result: WasteClassificationResult) => {
      setActiveResult(result);
      setLastClassification(result);
      setMotionPhase('LOCKED');
      setAutoCommitPaused(false);
      setAutoCommitSecondsLeft(autoCommitEnabled ? 3.0 : null);

      if (sensorMode === 'AI_VISUAL') {
        setOverrideWeightGrams(result.estimated_weight_grams);
      }

      const activeWeight =
        sensorMode === 'BLE_LOAD_CELL' && bleStatus === 'CONNECTED'
          ? bleChannels.activeGrams
          : sensorMode === 'MANUAL_SCALE'
            ? overrideWeightGrams
            : result.estimated_weight_grams;

      const catItem = getCatalogItem(catalog, result.material_code);
      const payout = calculatePayoutIdr(activeWeight, catItem.pricePerKgIdr);
      const targetBinText = binLabelIndonesian(result.bin_position);
      const spokenText =
        payout > 0
          ? `${result.item_name}, nilai ${payout} rupiah. Masukkan ke ${targetBinText}.`
          : `${result.item_name}, kategori residu. Masukkan ke ${targetBinText}.`;

      playScanLockBeep(ttsEnabled);
      window.setTimeout(() => {
        playClassificationCue(result.bin_position, ttsEnabled);
        speakInstructionId(spokenText, ttsEnabled);
      }, 150);
    },
    [
      autoCommitEnabled,
      bleChannels.activeGrams,
      bleStatus,
      catalog,
      overrideWeightGrams,
      sensorMode,
      ttsEnabled,
    ],
  );

  const runVisionOnDataUrl = useCallback(
    async (dataUrl: string | null) => {
      setIsScanning(true);
      setMotionPhase('SCANNING');
      setScanWarning(null);
      playScanLockBeep(ttsEnabled);

      const { result, warningMessage } = await analyzeSnapshotWithVision(
        dataUrl,
        geminiApiKey,
        catalog,
      );
      setScanWarning(warningMessage);
      setIsScanning(false);

      if (result) {
        presentClassificationResult(result);
      } else {
        setMotionPhase('IDLE');
      }
    },
    [catalog, geminiApiKey, presentClassificationResult, ttsEnabled],
  );

  const handleManualFrameScan = useCallback(async () => {
    if (isScanning) return;
    const snapshot = videoRef.current ? captureVideoSnapshotDataUrl(videoRef.current) : null;
    await runVisionOnDataUrl(snapshot);
  }, [isScanning, runVisionOnDataUrl]);

  const handleUploadPhotoFile = useCallback(
    async (file: File) => {
      if (isScanning) return;
      const dataUrl = await readImageFileAsDataUrl(file);
      await runVisionOnDataUrl(dataUrl);
    },
    [isScanning, runVisionOnDataUrl],
  );

  const handleClassifyManualMaterial = useCallback(
    (code: MaterialCode) => {
      const catItem = getCatalogItem(catalog, code);
      const weight =
        sensorMode === 'MANUAL_SCALE'
          ? overrideWeightGrams
          : sensorMode === 'BLE_LOAD_CELL' && bleStatus === 'CONNECTED'
            ? bleChannels.activeGrams
            : catItem.defaultWeightGrams;
      const payout = calculatePayoutIdr(weight, catItem.pricePerKgIdr);
      const binPos = catItem.binPosition;
      const targetName = binLabelIndonesian(binPos);

      const manualResult: WasteClassificationResult = {
        detected: true,
        item_name: catItem.name,
        bin_position: binPos,
        bin_category: catItem.binCategory,
        material_code: catItem.code,
        confidence: 1.0,
        cleanliness_grade: catItem.cleanlinessDefault,
        estimated_weight_grams: catItem.defaultWeightGrams,
        price_per_kg_idr: catItem.pricePerKgIdr,
        estimated_value_idr: payout,
        voice_instruction_id:
          payout > 0
            ? `${catItem.name}, nilai ${payout} rupiah. Masukkan ke ${targetName}.`
            : `${catItem.name}, kategori residu. Masukkan ke ${targetName}.`,
        recycling_tip: catItem.recyclingTip,
        source: 'MANUAL_ENTRY',
      };

      setScanWarning(null);
      setLastCommitToast(null);
      presentClassificationResult(manualResult);
    },
    [
      bleChannels.activeGrams,
      bleStatus,
      catalog,
      overrideWeightGrams,
      presentClassificationResult,
      sensorMode,
    ],
  );

  // 200ms background motion detector loop when Camera tab is active
  useEffect(() => {
    if (!cameraActive || !autoScanOnMotion || activeView !== 'camera') return;

    if (!motionScratchCanvasRef.current) {
      motionScratchCanvasRef.current = document.createElement('canvas');
    }

    let stabilizeTimer: number | null = null;

    const interval = window.setInterval(() => {
      if (
        !videoRef.current ||
        !motionScratchCanvasRef.current ||
        isScanning ||
        activeResult !== null ||
        Date.now() < motionCooldownUntilRef.current
      ) {
        return;
      }

      const luma = computeFrameLuma(videoRef.current, motionScratchCanvasRef.current);
      if (!luma) return;

      const analysis = compareMotionFrames(prevLumaRef.current, luma, motionSensitivity);
      prevLumaRef.current = analysis.frameLuma;
      setMotionScore(analysis.scorePercent);

      if (analysis.triggered && stabilizeTimer === null) {
        setMotionPhase('STABILIZING');
        stabilizeTimer = window.setTimeout(() => {
          stabilizeTimer = null;
          if (activeResult === null && !isScanning) {
            void handleManualFrameScan();
          }
        }, 400);
      }
    }, 200);

    return () => {
      window.clearInterval(interval);
      if (stabilizeTimer !== null) {
        window.clearTimeout(stabilizeTimer);
      }
    };
  }, [
    activeResult,
    activeView,
    autoScanOnMotion,
    cameraActive,
    handleManualFrameScan,
    isScanning,
    motionSensitivity,
  ]);

  const commitActiveClassification = useCallback(() => {
    if (!activeResult || !authSession) return;

    const catItem = getCatalogItem(catalog, activeResult.material_code);
    const totalCommittedGrams =
      sensorMode === 'BLE_LOAD_CELL' && bleStatus === 'CONNECTED'
        ? Math.max(1, bleChannels.activeGrams)
        : sensorMode === 'MANUAL_SCALE'
          ? Math.max(1, overrideWeightGrams)
          : Math.max(1, activeResult.estimated_weight_grams);

    const targetIds =
      authSession.role === 'PENGELOLA' &&
      accumulationMode === 'MULTI' &&
      batchCitizenIds.length > 0
        ? batchCitizenIds
        : [activeCitizen.id];

    const targetCitizens = targetIds
      .map((id) => citizens.find((c) => c.id === id))
      .filter((c): c is CitizenAccount => Boolean(c));

    const effectiveTargets = targetCitizens.length > 0 ? targetCitizens : [activeCitizen];
    const batchCount = effectiveTargets.length;

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const todayKey = getLocalDateKey(nowDate);
    const roleUsed: UserRole = authSession.role;

    const perHouseGrams = Math.max(1, Math.round(totalCommittedGrams / batchCount));
    const perHouseWeightKg = perHouseGrams / 1000;
    const totalBinWeightKg = totalCommittedGrams / 1000;
    const perHousePayout = calculatePayoutIdr(perHouseGrams, catItem.pricePerKgIdr);
    const perHouseCo2 = Number((perHouseWeightKg * catItem.co2FactorKgPerKg).toFixed(3));

    const newTransactions: TransactionRecord[] = [];
    const updatedMap = new Map<string, CitizenAccount>();

    let headlineLevelUp: string | null = null;
    let totalPointsSample = 0;

    for (let i = 0; i < effectiveTargets.length; i++) {
      const target = effectiveTargets[i];
      const nextStreak = computeNextStreak(target.lastSortedDate, target.streakDays, todayKey);
      const basePoints = computeSortPoints(
        activeResult.bin_position,
        perHouseGrams,
        activeResult.cleanliness_grade,
        nextStreak,
      );

      const draftTx: TransactionRecord = {
        id: `tx-${Date.now()}-${i}`,
        timestamp: nowIso,
        citizenId: target.id,
        citizenName: `${target.name} (${target.blockCode})`,
        materialCode: activeResult.material_code,
        itemName: activeResult.item_name,
        binPosition: activeResult.bin_position,
        weightGrams: perHouseGrams,
        pricePerKgIdr: catItem.pricePerKgIdr,
        payoutIdr: perHousePayout,
        pointsEarned: basePoints,
        co2SavedKg: perHouseCo2,
        sensorMode,
        cleanlinessGrade: activeResult.cleanliness_grade,
        recordedByRole: roleUsed,
        batchHouseCount: batchCount > 1 ? batchCount : undefined,
      };

      const existingDoneSet = new Set(
        target.dailyMissionsDoneDate === todayKey ? target.dailyMissionsDoneIds : [],
      );
      const updatedMissions = getCitizenDailyMissions(
        target,
        [draftTx, ...transactions],
        todayKey,
      );

      let missionBonusPoints = 0;
      const nextDoneMissionIds = Array.from(existingDoneSet);
      for (const mission of updatedMissions) {
        if (mission.completed && !existingDoneSet.has(mission.id)) {
          missionBonusPoints += mission.rewardPoints;
          nextDoneMissionIds.push(mission.id);
        }
      }

      const totalPointsEarned = basePoints + missionBonusPoints;
      totalPointsSample = totalPointsEarned;
      draftTx.pointsEarned = totalPointsEarned;
      newTransactions.push(draftTx);

      const prevTier = getLevelProgress(target.ecoPoints).currentTier;
      const updatedPoints = target.ecoPoints + totalPointsEarned;
      const nextTier = getLevelProgress(updatedPoints).currentTier;
      if (nextTier.level > prevTier.level && !headlineLevelUp) {
        headlineLevelUp = `${target.name} naik ke Lv.${nextTier.level} ${nextTier.title}!`;
      }

      const baseAccount: CitizenAccount = {
        ...target,
        totalWeightKg: Number((target.totalWeightKg + perHouseWeightKg).toFixed(3)),
        balanceIdr: target.balanceIdr + perHousePayout,
        co2SavedKg: Number((target.co2SavedKg + perHouseCo2).toFixed(3)),
        itemsSorted: target.itemsSorted + 1,
        ecoPoints: updatedPoints,
        streakDays: nextStreak,
        lastSortedDate: todayKey,
        plasticCount: target.plasticCount + (isPlasticMaterial(activeResult.material_code) ? 1 : 0),
        metalCount: target.metalCount + (activeResult.material_code === 'ALU_CAN' ? 1 : 0),
        organicCount: target.organicCount + (activeResult.bin_position === 'LEFT' ? 1 : 0),
        dailyMissionsDoneDate: todayKey,
        dailyMissionsDoneIds: nextDoneMissionIds,
      };

      updatedMap.set(target.id, {
        ...baseAccount,
        badges: evaluateUnlockedBadges(baseAccount),
      });
    }

    setTransactions((prev) => [...newTransactions, ...prev]);
    setCitizens((prev) => prev.map((c) => updatedMap.get(c.id) ?? c));
    setBins((prev) => {
      const target = prev[activeResult.bin_position];
      return {
        ...prev,
        [activeResult.bin_position]: {
          ...target,
          totalWeightKg: Number((target.totalWeightKg + totalBinWeightKg).toFixed(3)),
          itemCount: target.itemCount + 1,
          lastUpdated: nowIso,
        },
      };
    });

    playCommitSuccessChime(perHousePayout > 0 || totalPointsSample > 0, ttsEnabled);
    if (batchCount > 1) {
      setLastCommitToast(
        `Akumulasi ${batchCount} rumah (${totalCommittedGrams}g total): @${perHouseGrams}g -> +${formatIdr(
          perHousePayout,
        )} & +${totalPointsSample} Poin per rumah.`,
      );
    } else {
      setLastCommitToast(
        `Tercatat: ${activeResult.item_name} (${perHouseGrams}g) -> +${formatIdr(
          perHousePayout,
        )} & +${totalPointsSample} Poin Hijau.${headlineLevelUp ? ` ${headlineLevelUp}` : ''}`,
      );
    }

    motionCooldownUntilRef.current = Date.now() + 2000;
    setScanWarning(null);
    setActiveResult(null);
    setAutoCommitSecondsLeft(null);
    setAutoCommitPaused(false);
    setMotionPhase('IDLE');
  }, [
    accumulationMode,
    activeCitizen,
    activeResult,
    authSession,
    batchCitizenIds,
    bleChannels.activeGrams,
    bleStatus,
    catalog,
    citizens,
    overrideWeightGrams,
    sensorMode,
    setBins,
    setCitizens,
    setTransactions,
    transactions,
    ttsEnabled,
  ]);

  // 3-second auto-commit countdown
  useEffect(() => {
    if (!activeResult || !autoCommitEnabled || autoCommitPaused) return;

    const timer = window.setInterval(() => {
      setAutoCommitSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 0.1) {
          window.clearInterval(timer);
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [activeResult, autoCommitEnabled, autoCommitPaused]);

  useEffect(() => {
    if (activeResult && autoCommitSecondsLeft === 0) {
      commitActiveClassification();
    }
  }, [activeResult, autoCommitSecondsLeft, commitActiveClassification]);

  const handleCancelClassification = useCallback(() => {
    stopSpeechGuidance();
    playTactileClick(ttsEnabled);
    motionCooldownUntilRef.current = Date.now() + 1200;
    setScanWarning(null);
    setActiveResult(null);
    setAutoCommitSecondsLeft(null);
    setAutoCommitPaused(false);
    setMotionPhase('IDLE');
  }, [ttsEnabled]);

  const handleChangeManualWeight = useCallback(
    (grams: number) => {
      setSensorMode('MANUAL_SCALE');
      setOverrideWeightGrams(grams);
      if (activeResult && autoCommitEnabled && !autoCommitPaused) {
        setAutoCommitSecondsLeft(3.0);
      }
    },
    [activeResult, autoCommitEnabled, autoCommitPaused],
  );

  const handleResetToAiWeight = useCallback(() => {
    playTactileClick(ttsEnabled);
    setSensorMode(bleStatus === 'CONNECTED' ? 'BLE_LOAD_CELL' : 'AI_VISUAL');
    if (activeResult) {
      setOverrideWeightGrams(activeResult.estimated_weight_grams);
    }
  }, [activeResult, bleStatus, ttsEnabled]);

  const handleConnectBle = useCallback(async () => {
    playTactileClick(ttsEnabled);
    const session = await connectEsp32BleScale({
      onStatus: (status, message) => {
        setBleStatus(status);
        setBleMessage(message);
        if (status === 'CONNECTED') {
          setSensorMode('BLE_LOAD_CELL');
        } else if (status === 'DISCONNECTED') {
          setBleDeviceName(null);
          setSensorMode((prev) => (prev === 'BLE_LOAD_CELL' ? 'AI_VISUAL' : prev));
        }
      },
      onWeight: (weights) => {
        setBleChannels(weights);
        if (weights.activeGrams > 0) {
          setOverrideWeightGrams(weights.activeGrams);
        }
      },
    });
    if (session) {
      bleSessionRef.current = session;
      setBleDeviceName(session.deviceName);
    }
  }, [ttsEnabled]);

  const handleDisconnectBle = useCallback(() => {
    playTactileClick(ttsEnabled);
    bleSessionRef.current?.disconnect();
    bleSessionRef.current = null;
    setBleDeviceName(null);
    setBleStatus('DISCONNECTED');
    setSensorMode('AI_VISUAL');
  }, [ttsEnabled]);

  const handleInspectBin = useCallback(
    (pos: BinPosition) => {
      playTactileClick(ttsEnabled);
      const bin = bins[pos];
      const msg =
        pos === 'LEFT'
          ? 'Tong kiri khusus sampah organik, sisa makanan, daun, dan kulit buah untuk kompos.'
          : pos === 'CENTER'
            ? 'Tong tengah khusus anorganik bernilai jual seperti botol PET, kaleng aluminium, kardus, dan HDPE.'
            : 'Tong kanan khusus sampah residu seperti sachet kopi, styrofoam, dan tisu bekas.';
      setLastCommitToast(`${bin.code} (${bin.label}): ${msg}`);
      speakInstructionId(msg, ttsEnabled);
    },
    [bins, ttsEnabled],
  );

  const handleCreateCitizen = useCallback(
    (name: string, blockCode: string, qrCode: string, sortingMode: HouseSortingMode) => {
      const newCitizen = createHouseAccount({
        name,
        blockCode,
        qrCode,
        sortingMode,
      });
      setCitizens((prev) => [...prev, newCitizen]);
      setActiveCitizenId(newCitizen.id);
      if (sortingMode === 'KELOLAAN_POS') {
        setBatchCitizenIds((prev) => [...prev, newCitizen.id]);
      }
      playCommitSuccessChime(true, ttsEnabled);
      setLastCommitToast(`Rumah baru terdaftar: ${name} (${blockCode})`);
    },
    [setActiveCitizenId, setCitizens, ttsEnabled],
  );

  const handleLoginSuccess = useCallback(
    (account: SeedUserAccount) => {
      playTactileClick(ttsEnabled);
      if (account.role === 'PERORANGAN') {
        const targetHouse =
          citizens.find((c) => account.citizenId && c.id === account.citizenId) ??
          citizens.find((c) => !c.isCommunityPool) ??
          citizens[0];

        setCitizens((prev) =>
          prev.map((c) =>
            c.id === targetHouse.id ? { ...c, sortingMode: 'MANDIRI' } : c,
          ),
        );
        setActiveCitizenId(targetHouse.id);
        setAuthSession({
          role: 'PERORANGAN',
          username: account.username,
          operatorName: targetHouse.name,
          areaName: targetHouse.blockCode,
          citizenId: targetHouse.id,
          loggedInAt: new Date().toISOString(),
        });
        setActiveView('home');
        return;
      }

      setAuthSession({
        role: 'PENGELOLA',
        username: account.username,
        operatorName: account.displayName,
        areaName: account.areaLabel,
        loggedInAt: new Date().toISOString(),
      });
      const nonMandiriIds = citizens
        .filter((c) => !c.isCommunityPool && c.sortingMode === 'KELOLAAN_POS')
        .map((c) => c.id);
      setBatchCitizenIds(nonMandiriIds);
      setActiveView('home');
    },
    [citizens, setActiveCitizenId, setAuthSession, setCitizens, ttsEnabled],
  );

  const handleConfirmWithdrawal = useCallback(
    (
      citizenId: string,
      channel: PayoutChannel,
      destination: string,
      amountIdr: number,
    ) => {
      const target = citizens.find((c) => c.id === citizenId);
      if (!target) return;

      setCitizens((prev) =>
        prev.map((c) =>
          c.id === citizenId
            ? { ...c, balanceIdr: Math.max(0, c.balanceIdr - amountIdr) }
            : c,
        ),
      );

      const newWd: WithdrawalRecord = {
        id: `wd-${Date.now()}`,
        timestamp: new Date().toISOString(),
        citizenId,
        citizenName: `${target.name} (${target.blockCode})`,
        channel,
        destination,
        amountIdr,
      };
      setWithdrawals((prev) => [newWd, ...prev]);
      playCommitSuccessChime(true, ttsEnabled);
    },
    [citizens, setCitizens, setWithdrawals, ttsEnabled],
  );

  const handleUpdateCatalogItem = useCallback(
    (code: MaterialCode, field: 'pricePerKgIdr' | 'defaultWeightGrams', value: number) => {
      setCatalog((prev) =>
        prev.map((item) => (item.code === code ? { ...item, [field]: value } : item)),
      );
    },
    [setCatalog],
  );

  const handleResetLocalData = useCallback(() => {
    playTactileClick(ttsEnabled);
    stopCamera();
    const freshCitizens = createSeedCitizens();
    setCitizens(freshCitizens);
    setActiveCitizenId(freshCitizens[0].id);
    setTransactions(createSeedTransactions());
    setWithdrawals(createSeedWithdrawals());
    setBins(createSeedBins());
    setBatchCitizenIds(
      freshCitizens
        .filter((c) => !c.isCommunityPool && c.sortingMode === 'KELOLAAN_POS')
        .map((c) => c.id),
    );
    setActiveResult(null);
    setLastClassification(null);
    setScanWarning(null);
    setLastCommitToast('Data lokal berhasil dikembalikan ke kondisi awal seed testing.');
  }, [setActiveCitizenId, setBins, setCitizens, setTransactions, setWithdrawals, stopCamera, ttsEnabled]);

  const handleToggleFullscreen = useCallback(async () => {
    playTactileClick(ttsEnabled);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial on unsupported browsers
    }
  }, [ttsEnabled]);

  if (!authSession) {
    return (
      <div className="app-shell">
        <a href="#main-content" className="skip-link visually-hidden">
          Lewati ke form masuk
        </a>
        <AuthLoginScreen
          existingHouses={citizens}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className={`app-shell ${activeView === 'camera' ? 'is-kiosk-locked' : ''}`}>
      <a href="#main-content" className="skip-link visually-hidden">
        Lewati ke konten utama
      </a>

      <TopTelemetryBar
        session={authSession}
        activeView={activeView}
        onSelectView={(view) => {
          playTactileClick(ttsEnabled);
          setActiveView(view);
        }}
        isDesktop={isDesktop}
        wakeLockStatus={wakeLockStatus}
        onToggleWakeLock={() => {
          playTactileClick(ttsEnabled);
          toggleWakeLock();
        }}
        ttsEnabled={ttsEnabled}
        onToggleTts={() => {
          const next = !ttsEnabled;
          setTtsEnabled(next);
          if (!next) {
            stopSpeechGuidance();
          } else {
            playTactileClick(true);
          }
        }}
        activeCitizen={activeCitizen}
        citizens={citizens}
      />

      <main id="main-content" tabIndex={-1} className="app-main">
        {activeView === 'home' && (
          <HomeDashboardView
            session={authSession}
            citizens={citizens}
            activeCitizen={activeCitizen}
            bins={bins}
            transactions={transactions}
            onNavigateView={(view) => {
              playTactileClick(ttsEnabled);
              setActiveView(view);
            }}
            onStartAccumulateCamera={() => {
              playTactileClick(ttsEnabled);
              setAccumulationMode('MULTI');
              const nonMandiriIds = citizens
                .filter((c) => !c.isCommunityPool && c.sortingMode === 'KELOLAAN_POS')
                .map((c) => c.id);
              if (nonMandiriIds.length > 0) {
                setBatchCitizenIds(nonMandiriIds);
              }
              setActiveView('camera');
            }}
            onOpenRegisterCitizen={() => {
              playTactileClick(ttsEnabled);
              setRegisterDialogOpen(true);
            }}
          />
        )}

        {activeView === 'ledger' && (
          <LedgerView
            session={authSession}
            citizens={citizens}
            activeCitizen={activeCitizen}
            transactions={transactions}
            withdrawals={withdrawals}
            catalog={catalog}
            bins={bins}
            onOpenPayout={(citizen) => {
              playTactileClick(ttsEnabled);
              setPayoutTargetCitizen(citizen);
            }}
            onOpenRegisterCitizen={() => {
              playTactileClick(ttsEnabled);
              setRegisterDialogOpen(true);
            }}
            onUpdateCatalogItem={handleUpdateCatalogItem}
            onResetCatalogDefaults={() => {
              playTactileClick(ttsEnabled);
              setCatalog(INITIAL_MATERIAL_CATALOG);
            }}
            onGoToCamera={() => {
              playTactileClick(ttsEnabled);
              setActiveView('camera');
            }}
          />
        )}

        {activeView === 'camera' && (
          <KioskView
            session={authSession}
            isDesktop={isDesktop}
            videoRef={videoRef}
            cameraActive={cameraActive}
            cameraLoading={cameraLoading}
            cameraError={cameraError}
            torchSupported={torchSupported}
            torchOn={torchOn}
            onToggleCamera={handleToggleCamera}
            onToggleTorch={() => void handleToggleTorch()}
            onManualFrameScan={() => void handleManualFrameScan()}
            onUploadPhotoFile={(file) => void handleUploadPhotoFile(file)}
            onClassifyManualMaterial={handleClassifyManualMaterial}
            motionScore={motionScore}
            motionThreshold={motionSensitivity}
            motionPhase={motionPhase}
            isScanning={isScanning}
            scanWarning={scanWarning}
            activeResult={activeResult}
            catalog={catalog}
            sensorMode={sensorMode}
            overrideWeightGrams={overrideWeightGrams}
            onChangeManualWeight={handleChangeManualWeight}
            onResetToAiWeight={handleResetToAiWeight}
            bleStatus={bleStatus}
            bleLiveGrams={bleChannels.activeGrams}
            onConnectBle={() => void handleConnectBle()}
            autoCommitSecondsLeft={autoCommitSecondsLeft}
            autoCommitPaused={autoCommitPaused}
            onToggleAutoCommitPause={() => {
              playTactileClick(ttsEnabled);
              setAutoCommitPaused((prev) => !prev);
            }}
            onCommitClassification={commitActiveClassification}
            onCancelClassification={handleCancelClassification}
            bins={bins}
            onInspectBin={handleInspectBin}
            citizens={citizens}
            activeCitizen={activeCitizen}
            onSelectActiveCitizen={(id) => {
              playTactileClick(ttsEnabled);
              setActiveCitizenId(id);
            }}
            onOpenQrDialog={() => {
              playTactileClick(ttsEnabled);
              setQrDialogOpen(true);
            }}
            onOpenRegisterCitizen={() => {
              playTactileClick(ttsEnabled);
              setRegisterDialogOpen(true);
            }}
            accumulationMode={accumulationMode}
            onChangeAccumulationMode={(mode) => {
              playTactileClick(ttsEnabled);
              setAccumulationMode(mode);
            }}
            batchCitizenIds={batchCitizenIds}
            onToggleBatchCitizen={(id) => {
              playTactileClick(ttsEnabled);
              setBatchCitizenIds((prev) =>
                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
              );
            }}
            onSelectAllNonMandiri={() => {
              playTactileClick(ttsEnabled);
              const ids = citizens
                .filter((c) => !c.isCommunityPool && c.sortingMode === 'KELOLAAN_POS')
                .map((c) => c.id);
              setBatchCitizenIds(
                ids.length > 0
                  ? ids
                  : citizens.filter((c) => !c.isCommunityPool).map((c) => c.id),
              );
            }}
            transactions={transactions}
            lastCommitToast={lastCommitToast}
          />
        )}

        {activeView === 'devices' && (
          <DiagnosticsView
            themePreference={themePreference}
            onChangeThemePreference={(pref) => {
              playTactileClick(ttsEnabled);
              setThemePreference(pref);
            }}
            geminiApiKey={geminiApiKey}
            onChangeGeminiApiKey={setGeminiApiKey}
            bleStatus={bleStatus}
            bleMessage={bleMessage}
            bleDeviceName={bleDeviceName}
            bleChannels={bleChannels}
            onConnectBle={() => void handleConnectBle()}
            onDisconnectBle={handleDisconnectBle}
            sensorMode={sensorMode}
            overrideWeightGrams={overrideWeightGrams}
            onChangeManualWeight={handleChangeManualWeight}
            motionSensitivity={motionSensitivity}
            onChangeMotionSensitivity={setMotionSensitivity}
            autoScanOnMotion={autoScanOnMotion}
            onToggleAutoScanOnMotion={() => setAutoScanOnMotion((p) => !p)}
            autoCommitEnabled={autoCommitEnabled}
            onToggleAutoCommitEnabled={() => setAutoCommitEnabled((p) => !p)}
            ttsEnabled={ttsEnabled}
            onTestIndonesianVoice={() => {
              playScanLockBeep(true);
              speakInstructionId(
                'Sistem audio SORTA aktif. Botol plastik PET, nilai sembilan puluh sembilan rupiah. Masukkan ke tong tengah.',
                true,
              );
            }}
            lastClassification={lastClassification}
            cameraActive={cameraActive}
            onToggleCamera={handleToggleCamera}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => void handleToggleFullscreen()}
            onResetLocalData={handleResetLocalData}
          />
        )}

        {activeView === 'profile' && (
          <ProfileView
            session={authSession}
            citizens={citizens}
            activeCitizen={activeCitizen}
            onUpdateCitizenProfile={(id, name, blockCode) => {
              setCitizens((prev) =>
                prev.map((c) => (c.id === id ? { ...c, name, blockCode } : c)),
              );
            }}
            onToggleHouseSortingMode={(id, mode) => {
              playTactileClick(ttsEnabled);
              setCitizens((prev) =>
                prev.map((c) => (c.id === id ? { ...c, sortingMode: mode } : c)),
              );
            }}
            onSelectActiveCitizen={(id) => {
              playTactileClick(ttsEnabled);
              setActiveCitizenId(id);
            }}
            onOpenRegisterCitizen={() => {
              playTactileClick(ttsEnabled);
              setRegisterDialogOpen(true);
            }}
            onSwitchRoleTo={(targetRole) => {
              playTactileClick(ttsEnabled);
              if (targetRole === 'PENGELOLA') {
                setAuthSession({
                  role: 'PENGELOLA',
                  username: 'pos-rw04',
                  operatorName: 'Pak Hendra Wijaya',
                  areaName: 'Pos Bank Sampah RW 04',
                  loggedInAt: new Date().toISOString(),
                });
              } else {
                const house = citizens.find((c) => !c.isCommunityPool) ?? citizens[0];
                setActiveCitizenId(house.id);
                setAuthSession({
                  role: 'PERORANGAN',
                  username: house.qrCode.toLowerCase(),
                  operatorName: house.name,
                  areaName: house.blockCode,
                  citizenId: house.id,
                  loggedInAt: new Date().toISOString(),
                });
              }
            }}
            onLogout={() => {
              playTactileClick(ttsEnabled);
              stopCamera();
              setAuthSession(null);
            }}
          />
        )}
      </main>

      <QrCitizenDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        citizens={citizens}
        activeCitizenId={activeCitizen.id}
        onSelectCitizen={(id) => {
          playTactileClick(ttsEnabled);
          setActiveCitizenId(id);
        }}
        onRequestRegisterCitizen={() => {
          playTactileClick(ttsEnabled);
          setRegisterDialogOpen(true);
        }}
        cameraStream={cameraStreamState}
      />

      <RegisterCitizenDialog
        open={registerDialogOpen}
        existingCitizens={citizens}
        defaultSortingMode={authSession.role === 'PENGELOLA' ? 'KELOLAAN_POS' : 'MANDIRI'}
        onClose={() => setRegisterDialogOpen(false)}
        onCreateCitizen={handleCreateCitizen}
      />

      <PayoutDialog
        citizen={payoutTargetCitizen}
        onClose={() => setPayoutTargetCitizen(null)}
        onConfirmWithdrawal={handleConfirmWithdrawal}
      />

      {/* 5-Tab Samsung One UI Bottom Navigation Bar with Elevated Center Camera Tab */}
      {!isDesktop && (
        <nav className="mobile-bottom-nav" aria-label="Menu Utama">
          <button
            type="button"
            className="mobile-nav-btn"
            aria-current={activeView === 'home' ? 'page' : undefined}
            onClick={() => {
              playTactileClick(ttsEnabled);
              setActiveView('home');
            }}
          >
            <HomeNavIcon />
            <span>Home</span>
          </button>

          <button
            type="button"
            className="mobile-nav-btn"
            aria-current={activeView === 'ledger' ? 'page' : undefined}
            onClick={() => {
              playTactileClick(ttsEnabled);
              setActiveView('ledger');
            }}
          >
            <LedgerNavIcon />
            <span>Bank Sampah</span>
          </button>

          <button
            type="button"
            className="mobile-nav-btn is-center-camera"
            aria-current={activeView === 'camera' ? 'page' : undefined}
            onClick={() => {
              playTactileClick(ttsEnabled);
              setActiveView('camera');
            }}
          >
            <span className="center-camera-circle" aria-hidden="true">
              <CameraLensIcon />
            </span>
            <span>Kamera</span>
          </button>

          <button
            type="button"
            className="mobile-nav-btn"
            aria-current={activeView === 'devices' ? 'page' : undefined}
            onClick={() => {
              playTactileClick(ttsEnabled);
              setActiveView('devices');
            }}
          >
            <DeviceNavIcon />
            <span>Perangkat</span>
          </button>

          <button
            type="button"
            className="mobile-nav-btn"
            aria-current={activeView === 'profile' ? 'page' : undefined}
            onClick={() => {
              playTactileClick(ttsEnabled);
              setActiveView('profile');
            }}
          >
            <ProfileNavIcon />
            <span>Profil</span>
          </button>
        </nav>
      )}
    </div>
  );
}
export default App;
