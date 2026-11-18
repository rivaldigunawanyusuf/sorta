import type {
  BinPosition,
  BinState,
  CitizenAccount,
  HouseSortingMode,
  MaterialCatalogItem,
  MaterialCode,
} from '../types/sorta';

export const INITIAL_MATERIAL_CATALOG: MaterialCatalogItem[] = [
  {
    code: 'PET_CLEAR',
    name: 'Botol Plastik PET Bening (Bersih)',
    binPosition: 'CENTER',
    binCategory: 'ANORGANIK_EKONOMIS',
    defaultWeightGrams: 22,
    pricePerKgIdr: 4500,
    co2FactorKgPerKg: 1.7,
    cleanlinessDefault: 'A',
    recyclingTip: 'Lepaskan tutup botol dan remukkan untuk menghemat ruang tong.',
    silhouette: 'pet',
  },
  {
    code: 'ALU_CAN',
    name: 'Kaleng Aluminium (Minuman)',
    binPosition: 'CENTER',
    binCategory: 'ANORGANIK_EKONOMIS',
    defaultWeightGrams: 15,
    pricePerKgIdr: 14000,
    co2FactorKgPerKg: 9.1,
    cleanlinessDefault: 'A',
    recyclingTip: 'Kosongkan sisa cairan dan tekan kaleng sebelum dimasukkan.',
    silhouette: 'can',
  },
  {
    code: 'HDPE_BOTTLE',
    name: 'Botol HDPE (Sampo / Sabun)',
    binPosition: 'CENTER',
    binCategory: 'ANORGANIK_EKONOMIS',
    defaultWeightGrams: 45,
    pricePerKgIdr: 5000,
    co2FactorKgPerKg: 1.5,
    cleanlinessDefault: 'A',
    recyclingTip: 'Bilas ringan bagian dalam botol agar tidak mencemari muatan lain.',
    silhouette: 'hdpe',
  },
  {
    code: 'CARDBOARD',
    name: 'Kardus / Karton Lipat',
    binPosition: 'CENTER',
    binCategory: 'ANORGANIK_EKONOMIS',
    defaultWeightGrams: 150,
    pricePerKgIdr: 2200,
    co2FactorKgPerKg: 1.1,
    cleanlinessDefault: 'A',
    recyclingTip: 'Lipat rata kardus kering dan lepaskan lakban berlebih.',
    silhouette: 'cardboard',
  },
  {
    code: 'PP_CUP',
    name: 'Gelas Plastik Air Mineral (PP)',
    binPosition: 'CENTER',
    binCategory: 'ANORGANIK_EKONOMIS',
    defaultWeightGrams: 8,
    pricePerKgIdr: 5500,
    co2FactorKgPerKg: 1.4,
    cleanlinessDefault: 'A',
    recyclingTip: 'Pisahkan lid segel plastik tipis dan buang ke tong kanan jika kotor.',
    silhouette: 'pet',
  },
  {
    code: 'GLASS_BTL',
    name: 'Botol Kaca Utuh',
    binPosition: 'CENTER',
    binCategory: 'ANORGANIK_EKONOMIS',
    defaultWeightGrams: 250,
    pricePerKgIdr: 1000,
    co2FactorKgPerKg: 0.4,
    cleanlinessDefault: 'A',
    recyclingTip: 'Letakkan perlahan ke tong tengah agar botol kaca tidak pecah.',
    silhouette: 'pet',
  },
  {
    code: 'ORGANIC_BIO',
    name: 'Sampah Sisa Makanan / Organik',
    binPosition: 'LEFT',
    binCategory: 'ORGANIK_KOMPOS',
    defaultWeightGrams: 100,
    pricePerKgIdr: 500,
    co2FactorKgPerKg: 0.8,
    cleanlinessDefault: 'B',
    recyclingTip: 'Pastikan bebas bungkus plastik atau karet gelang sebelum dikompos.',
    silhouette: 'organic',
  },
  {
    code: 'RESIDUE_GEN',
    name: 'Sampah Residu / Multilayer',
    binPosition: 'RIGHT',
    binCategory: 'RESIDU_TOLAK',
    defaultWeightGrams: 15,
    pricePerKgIdr: 0,
    co2FactorKgPerKg: 0,
    cleanlinessDefault: 'C',
    recyclingTip: 'Kurangi kemasan sachet sekali pakai atau gunakan wadah isi ulang.',
    silhouette: 'residue',
  },
];

export function getCatalogItem(
  catalog: MaterialCatalogItem[],
  code: MaterialCode,
): MaterialCatalogItem {
  return catalog.find((item) => item.code === code) ?? catalog[0];
}

export function createHouseAccount(params: {
  id?: string;
  name: string;
  blockCode: string;
  qrCode: string;
  sortingMode: HouseSortingMode;
  isCommunityPool?: boolean;
}): CitizenAccount {
  return {
    id: params.id ?? `ctz-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: params.name,
    blockCode: params.blockCode,
    qrCode: params.qrCode,
    sortingMode: params.sortingMode,
    isCommunityPool: params.isCommunityPool ?? false,
    totalWeightKg: 0,
    balanceIdr: 0,
    co2SavedKg: 0,
    itemsSorted: 0,
    ecoPoints: 0,
    streakDays: 0,
    lastSortedDate: null,
    badges: [],
    plasticCount: 0,
    metalCount: 0,
    organicCount: 0,
    dailyMissionsDoneDate: null,
    dailyMissionsDoneIds: [],
  };
}

export const INITIAL_CITIZENS: CitizenAccount[] = [
  createHouseAccount({
    id: 'ctz-pool',
    name: 'Kas Umum Komunitas',
    blockCode: 'Pos Utama',
    qrCode: 'SORTA-KOMUNITAS',
    sortingMode: 'KELOLAAN_POS',
    isCommunityPool: true,
  }),
];

export const INITIAL_BINS: Record<BinPosition, BinState> = {
  LEFT: {
    position: 'LEFT',
    code: 'TONG KIRI',
    label: 'ORGANIK',
    categoryLabel: 'Kompos / Biodegradable',
    totalWeightKg: 0,
    itemCount: 0,
    capacityKg: 20,
    lastUpdated: null,
  },
  CENTER: {
    position: 'CENTER',
    code: 'TONG TENGAH',
    label: 'ANORGANIK BERNILAI',
    categoryLabel: 'Bank Sampah Rupiah',
    totalWeightKg: 0,
    itemCount: 0,
    capacityKg: 20,
    lastUpdated: null,
  },
  RIGHT: {
    position: 'RIGHT',
    code: 'TONG KANAN',
    label: 'RESIDU',
    categoryLabel: 'Non-Recyclable / Reject',
    totalWeightKg: 0,
    itemCount: 0,
    capacityKg: 15,
    lastUpdated: null,
  },
};

export function formatIdr(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export function calculatePayoutIdr(weightGrams: number, pricePerKgIdr: number): number {
  return Math.round((Math.max(0, weightGrams) / 1000) * Math.max(0, pricePerKgIdr));
}

export function binLabelIndonesian(position: BinPosition): string {
  if (position === 'LEFT') return 'tong kiri';
  if (position === 'CENTER') return 'tong tengah';
  return 'tong kanan';
}
