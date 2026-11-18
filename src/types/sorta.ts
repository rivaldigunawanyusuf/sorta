export type BinPosition = 'LEFT' | 'CENTER' | 'RIGHT';

export type BinCategory = 'ORGANIK_KOMPOS' | 'ANORGANIK_EKONOMIS' | 'RESIDU_TOLAK';

export type CleanlinessGrade = 'A' | 'B' | 'C';

export type MaterialCode =
  | 'PET_CLEAR'
  | 'ALU_CAN'
  | 'HDPE_BOTTLE'
  | 'CARDBOARD'
  | 'PP_CUP'
  | 'GLASS_BTL'
  | 'ORGANIC_BIO'
  | 'RESIDUE_GEN';

export type ClassificationSource = 'GEMINI_VISION' | 'LOCAL_CLASSIFIER' | 'MANUAL_ENTRY';

export type WeightSensorMode = 'AI_VISUAL' | 'MANUAL_SCALE' | 'BLE_LOAD_CELL';

export type AppView = 'home' | 'ledger' | 'camera' | 'devices' | 'profile';

export type UserRole = 'PENGELOLA' | 'PERORANGAN';

export type HouseSortingMode = 'MANDIRI' | 'KELOLAAN_POS';

export interface AuthSession {
  role: UserRole;
  username: string;
  operatorName: string;
  areaName: string;
  citizenId?: string;
  loggedInAt: string;
}

export interface SeedUserAccount {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  areaLabel: string;
  citizenId?: string;
}

export type BadgeId =
  | 'first-sort'
  | 'plastic-saver'
  | 'metal-hunter'
  | 'compost-hero'
  | 'zero-waste-kg';

export type MaterialSilhouette =
  | 'pet'
  | 'can'
  | 'cardboard'
  | 'hdpe'
  | 'organic'
  | 'residue';

export interface WasteClassificationResult {
  detected: boolean;
  item_name: string;
  bin_position: BinPosition;
  bin_category: BinCategory;
  material_code: MaterialCode;
  confidence: number;
  cleanliness_grade: CleanlinessGrade;
  estimated_weight_grams: number;
  price_per_kg_idr: number;
  estimated_value_idr: number;
  voice_instruction_id: string;
  recycling_tip: string;
  source?: ClassificationSource;
}

export interface MaterialCatalogItem {
  code: MaterialCode;
  name: string;
  binPosition: BinPosition;
  binCategory: BinCategory;
  defaultWeightGrams: number;
  pricePerKgIdr: number;
  co2FactorKgPerKg: number;
  cleanlinessDefault: CleanlinessGrade;
  recyclingTip: string;
  silhouette: MaterialSilhouette;
}

export interface CitizenAccount {
  id: string;
  name: string;
  blockCode: string;
  qrCode: string;
  sortingMode: HouseSortingMode;
  isCommunityPool: boolean;
  totalWeightKg: number;
  balanceIdr: number;
  co2SavedKg: number;
  itemsSorted: number;
  ecoPoints: number;
  streakDays: number;
  lastSortedDate: string | null;
  badges: BadgeId[];
  plasticCount: number;
  metalCount: number;
  organicCount: number;
  dailyMissionsDoneDate: string | null;
  dailyMissionsDoneIds: string[];
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  citizenId: string;
  citizenName: string;
  materialCode: MaterialCode;
  itemName: string;
  binPosition: BinPosition;
  weightGrams: number;
  pricePerKgIdr: number;
  payoutIdr: number;
  pointsEarned: number;
  co2SavedKg: number;
  sensorMode: WeightSensorMode;
  cleanlinessGrade: CleanlinessGrade;
  recordedByRole: UserRole;
  batchHouseCount?: number;
}

export type PayoutChannel = 'GoPay' | 'OVO' | 'Token Listrik PLN' | 'Kas Tunai RT';

export interface WithdrawalRecord {
  id: string;
  timestamp: string;
  citizenId: string;
  citizenName: string;
  channel: PayoutChannel;
  destination: string;
  amountIdr: number;
}

export interface BinState {
  position: BinPosition;
  code: string;
  label: string;
  categoryLabel: string;
  totalWeightKg: number;
  itemCount: number;
  capacityKg: number;
  lastUpdated: string | null;
}

export interface BleChannelWeights {
  leftGrams: number;
  centerGrams: number;
  rightGrams: number;
  activeGrams: number;
}

export type BleConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'UNSUPPORTED'
  | 'ERROR';
