import type {
  BadgeId,
  BinPosition,
  CitizenAccount,
  CleanlinessGrade,
  MaterialCode,
  TransactionRecord,
} from '../types/sorta';

export interface LevelTier {
  level: number;
  title: string;
  minPoints: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, title: 'Pemula Pilah', minPoints: 0 },
  { level: 2, title: 'Penjaga Hijau', minPoints: 100 },
  { level: 3, title: 'Penggerak Komunitas', minPoints: 300 },
  { level: 4, title: 'Juara Sirkular', minPoints: 600 },
  { level: 5, title: 'Duta Lingkungan', minPoints: 1000 },
];

export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  description: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-sort',
    title: 'Langkah Pertama',
    description: 'Menyelesaikan setoran pilah sampah pertama',
  },
  {
    id: 'plastic-saver',
    title: 'Penyelamat Plastik',
    description: 'Memilah minimal 3 item plastik PET, HDPE, atau PP',
  },
  {
    id: 'metal-hunter',
    title: 'Pemburu Logam',
    description: 'Menyetorkan kaleng aluminium bernilai tinggi',
  },
  {
    id: 'compost-hero',
    title: 'Sahabat Kompos',
    description: 'Memilah minimal 2 item sampah organik untuk kompos',
  },
  {
    id: 'zero-waste-kg',
    title: '1 kg Bebas TPA',
    description: 'Mencegah minimal 1 kg sampah terbuang ke TPA',
  },
];

export interface DailyMissionStatus {
  id: string;
  title: string;
  rewardPoints: number;
  current: number;
  target: number;
  completed: boolean;
}

export const COMMUNITY_DIVERSION_TARGET_KG = 50;

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLevelProgress(ecoPoints: number): {
  currentTier: LevelTier;
  nextTier: LevelTier | null;
  progressPct: number;
  pointsToNext: number;
} {
  let currentTier = LEVEL_TIERS[0];
  let nextTier: LevelTier | null = LEVEL_TIERS[1] ?? null;

  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (ecoPoints >= LEVEL_TIERS[i].minPoints) {
      currentTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] ?? null;
    }
  }

  if (!nextTier) {
    return { currentTier, nextTier: null, progressPct: 100, pointsToNext: 0 };
  }

  const span = Math.max(1, nextTier.minPoints - currentTier.minPoints);
  const gained = Math.max(0, ecoPoints - currentTier.minPoints);
  const progressPct = Math.min(100, Math.round((gained / span) * 100));
  return {
    currentTier,
    nextTier,
    progressPct,
    pointsToNext: Math.max(0, nextTier.minPoints - ecoPoints),
  };
}

export function computeSortPoints(
  binPosition: BinPosition,
  weightGrams: number,
  cleanlinessGrade: CleanlinessGrade,
  streakDays: number,
): number {
  const basePoints =
    binPosition === 'CENTER' ? 25 : binPosition === 'LEFT' ? 15 : 5;
  const weightBonus =
    binPosition === 'CENTER'
      ? Math.floor(Math.max(0, weightGrams) / 40)
      : binPosition === 'LEFT'
        ? Math.floor(Math.max(0, weightGrams) / 50)
        : 0;
  const gradeBonus = cleanlinessGrade === 'A' ? 5 : 0;
  const streakBonus = streakDays >= 2 ? 5 : 0;
  return basePoints + weightBonus + gradeBonus + streakBonus;
}

export function computeNextStreak(
  lastSortedDate: string | null,
  currentStreak: number,
  todayKey: string,
): number {
  if (lastSortedDate === todayKey) {
    return Math.max(1, currentStreak);
  }
  if (!lastSortedDate) {
    return 1;
  }
  const lastDate = new Date(`${lastSortedDate}T00:00:00`);
  const todayDate = new Date(`${todayKey}T00:00:00`);
  const diffDays = Math.round(
    (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 1) {
    return Math.max(1, currentStreak) + 1;
  }
  return 1;
}

export function getCitizenDailyMissions(
  citizen: CitizenAccount,
  transactions: TransactionRecord[],
  todayKey = getLocalDateKey(),
): DailyMissionStatus[] {
  const todayTx = transactions.filter(
    (tx) =>
      tx.citizenId === citizen.id &&
      getLocalDateKey(new Date(tx.timestamp)) === todayKey,
  );

  const doneTodaySet = new Set(
    citizen.dailyMissionsDoneDate === todayKey ? citizen.dailyMissionsDoneIds : [],
  );

  const totalItemsToday = todayTx.length;
  const centerItemsToday = todayTx.filter((t) => t.binPosition === 'CENTER').length;
  const leftItemsToday = todayTx.filter((t) => t.binPosition === 'LEFT').length;

  return [
    {
      id: 'daily-3-items',
      title: 'Pilah 3 item hari ini',
      rewardPoints: 30,
      current: Math.min(3, totalItemsToday),
      target: 3,
      completed: totalItemsToday >= 3 || doneTodaySet.has('daily-3-items'),
    },
    {
      id: 'daily-recyclable',
      title: 'Setor 1 anorganik bernilai',
      rewardPoints: 25,
      current: Math.min(1, centerItemsToday),
      target: 1,
      completed: centerItemsToday >= 1 || doneTodaySet.has('daily-recyclable'),
    },
    {
      id: 'daily-organic',
      title: 'Pilah 1 organik kompos',
      rewardPoints: 20,
      current: Math.min(1, leftItemsToday),
      target: 1,
      completed: leftItemsToday >= 1 || doneTodaySet.has('daily-organic'),
    },
  ];
}

export function isPlasticMaterial(code: MaterialCode): boolean {
  return code === 'PET_CLEAR' || code === 'HDPE_BOTTLE' || code === 'PP_CUP';
}

export function evaluateUnlockedBadges(citizen: CitizenAccount): BadgeId[] {
  const unlocked = new Set<BadgeId>(citizen.badges);
  if (citizen.itemsSorted >= 1) unlocked.add('first-sort');
  if (citizen.plasticCount >= 3) unlocked.add('plastic-saver');
  if (citizen.metalCount >= 1) unlocked.add('metal-hunter');
  if (citizen.organicCount >= 2) unlocked.add('compost-hero');
  if (citizen.totalWeightKg >= 1) unlocked.add('zero-waste-kg');
  return Array.from(unlocked);
}
