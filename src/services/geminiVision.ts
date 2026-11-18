import {
  binLabelIndonesian,
  calculatePayoutIdr,
  getCatalogItem,
} from '../data/catalog';
import type {
  BinCategory,
  BinPosition,
  CleanlinessGrade,
  MaterialCatalogItem,
  MaterialCode,
  WasteClassificationResult,
} from '../types/sorta';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const VALID_MATERIALS: MaterialCode[] = [
  'PET_CLEAR',
  'ALU_CAN',
  'HDPE_BOTTLE',
  'CARDBOARD',
  'PP_CUP',
  'GLASS_BTL',
  'ORGANIC_BIO',
  'RESIDUE_GEN',
];

function binCategoryForPosition(pos: BinPosition): BinCategory {
  if (pos === 'LEFT') return 'ORGANIK_KOMPOS';
  if (pos === 'CENTER') return 'ANORGANIK_EKONOMIS';
  return 'RESIDU_TOLAK';
}

function buildVoiceLine(
  itemName: string,
  payoutIdr: number,
  binPosition: BinPosition,
): string {
  const target = binLabelIndonesian(binPosition);
  if (payoutIdr > 0) {
    return `${itemName}, estimasi ${payoutIdr} rupiah. Masukkan ke ${target}.`;
  }
  return `${itemName}, kategori residu tanpa nilai jual. Masukkan ke ${target}.`;
}

export function captureVideoSnapshotDataUrl(video: HTMLVideoElement): string | null {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }
  const canvas = document.createElement('canvas');
  const maxWidth = 640;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.max(160, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(120, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function classifyFromCanvasColorSignature(
  dataUrl: string,
  catalog: MaterialCatalogItem[],
): Promise<WasteClassificationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 36;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const fallback = getCatalogItem(catalog, 'PET_CLEAR');
        resolve(buildLocalResult(fallback, 0.86, catalog));
        return;
      }
      ctx.drawImage(img, 0, 0, 48, 36);
      const { data } = ctx.getImageData(8, 6, 32, 24);

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let highLuma = 0;
      let metallicVariance = 0;
      const count = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        rSum += r;
        gSum += g;
        bSum += b;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luma > 185) highLuma += 1;
        if (Math.abs(r - g) < 16 && Math.abs(g - b) < 16 && luma > 130) {
          metallicVariance += 1;
        }
      }

      const avgR = rSum / count;
      const avgG = gSum / count;
      const avgB = bSum / count;

      let chosenCode: MaterialCode = 'PET_CLEAR';
      let confidence = 0.89;

      if (avgG > avgR * 1.12 && avgG > avgB * 1.12) {
        chosenCode = 'ORGANIC_BIO';
        confidence = 0.91;
      } else if (avgR > avgG * 1.18 && avgG > avgB * 1.18 && avgR > 95) {
        chosenCode = 'CARDBOARD';
        confidence = 0.9;
      } else if (metallicVariance / count > 0.36 && highLuma / count < 0.45) {
        chosenCode = 'ALU_CAN';
        confidence = 0.92;
      } else if (highLuma / count > 0.42 || avgB > avgR * 1.08) {
        chosenCode = 'PET_CLEAR';
        confidence = 0.93;
      } else if (avgR + avgG + avgB < 210) {
        chosenCode = 'RESIDUE_GEN';
        confidence = 0.85;
      } else {
        chosenCode = 'HDPE_BOTTLE';
        confidence = 0.87;
      }

      const item = getCatalogItem(catalog, chosenCode);
      resolve(buildLocalResult(item, confidence, catalog));
    };
    img.onerror = () => {
      const fallback = getCatalogItem(catalog, 'PET_CLEAR');
      resolve(buildLocalResult(fallback, 0.85, catalog));
    };
    img.src = dataUrl;
  });
}

function buildLocalResult(
  item: MaterialCatalogItem,
  confidence: number,
  _catalog: MaterialCatalogItem[],
): WasteClassificationResult {
  const payout = calculatePayoutIdr(item.defaultWeightGrams, item.pricePerKgIdr);
  return {
    detected: true,
    item_name: item.name,
    bin_position: item.binPosition,
    bin_category: item.binCategory,
    material_code: item.code,
    confidence,
    cleanliness_grade: item.cleanlinessDefault,
    estimated_weight_grams: item.defaultWeightGrams,
    price_per_kg_idr: item.pricePerKgIdr,
    estimated_value_idr: payout,
    voice_instruction_id: buildVoiceLine(item.name, payout, item.binPosition),
    recycling_tip: item.recyclingTip,
    source: 'LOCAL_CLASSIFIER',
  };
}

export interface VisionScanResponse {
  result: WasteClassificationResult | null;
  warningMessage: string | null;
}

export async function readImageFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : null;
      if (!src) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.max(160, Math.round(img.width * scale));
        canvas.height = Math.max(120, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export async function analyzeSnapshotWithVision(
  dataUrl: string | null,
  apiKey: string,
  catalog: MaterialCatalogItem[],
): Promise<VisionScanResponse> {
  if (!dataUrl) {
    return {
      result: null,
      warningMessage: 'Frame kamera belum siap. Pastikan kamera aktif atau unggah foto sampah.',
    };
  }

  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    const localResult = await classifyFromCanvasColorSignature(dataUrl, catalog);
    return {
      result: localResult,
      warningMessage:
        'Mode AI Lokal aktif. Tambahkan Gemini API Key di Pengaturan untuk pengenalan objek lebih akurat.',
    };
  }

  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const catalogSummary = catalog
    .map(
      (c) =>
        `${c.code} (${c.name}) -> bin ${c.binPosition}, default ${c.defaultWeightGrams}g, price Rp ${c.pricePerKgIdr}/kg`,
    )
    .join('\n');

  const prompt = [
    'You are SORTA Waste Vision Classifier mounted above 3 trash bins: LEFT (Organik), CENTER (Anorganik Bernilai), RIGHT (Residu).',
    'Inspect the photo and return ONLY valid JSON matching the exact schema below.',
    'Use one material_code from:',
    catalogSummary,
    'Schema:',
    JSON.stringify({
      detected: true,
      item_name: 'Botol Plastik Air Mineral (PET)',
      bin_position: 'CENTER',
      bin_category: 'ANORGANIK_EKONOMIS',
      material_code: 'PET_CLEAR',
      confidence: 0.96,
      cleanliness_grade: 'A',
      estimated_weight_grams: 22,
      price_per_kg_idr: 4500,
      estimated_value_idr: 99,
      voice_instruction_id:
        'Botol plastik PET bersih, estimasi sembilan puluh sembilan rupiah. Masukkan ke tong tengah.',
      recycling_tip: 'Lepaskan tutup botol dan remukkan untuk menghemat ruang tong.',
    }),
  ].join('\n');

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(trimmedKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Data } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.15,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Respons Gemini kosong');
    }

    const parsed = JSON.parse(rawText) as Partial<WasteClassificationResult>;
    const materialCode = VALID_MATERIALS.includes(parsed.material_code as MaterialCode)
      ? (parsed.material_code as MaterialCode)
      : 'RESIDUE_GEN';
    const catalogMatch = getCatalogItem(catalog, materialCode);

    const binPos: BinPosition =
      parsed.bin_position === 'LEFT' ||
      parsed.bin_position === 'CENTER' ||
      parsed.bin_position === 'RIGHT'
        ? parsed.bin_position
        : catalogMatch.binPosition;

    const grade: CleanlinessGrade =
      parsed.cleanliness_grade === 'A' ||
      parsed.cleanliness_grade === 'B' ||
      parsed.cleanliness_grade === 'C'
        ? parsed.cleanliness_grade
        : catalogMatch.cleanlinessDefault;

    const weightGrams =
      typeof parsed.estimated_weight_grams === 'number' && parsed.estimated_weight_grams > 0
        ? Math.round(parsed.estimated_weight_grams)
        : catalogMatch.defaultWeightGrams;

    const itemName =
      typeof parsed.item_name === 'string' && parsed.item_name.trim().length > 0
        ? parsed.item_name.trim()
        : catalogMatch.name;

    const pricePerKg = catalogMatch.pricePerKgIdr;
    const payout = calculatePayoutIdr(weightGrams, pricePerKg);

    return {
      result: {
        detected: parsed.detected ?? true,
        item_name: itemName,
        bin_position: binPos,
        bin_category: binCategoryForPosition(binPos),
        material_code: materialCode,
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.min(0.999, Math.max(0.5, parsed.confidence))
            : 0.94,
        cleanliness_grade: grade,
        estimated_weight_grams: weightGrams,
        price_per_kg_idr: pricePerKg,
        estimated_value_idr: payout,
        voice_instruction_id:
          typeof parsed.voice_instruction_id === 'string' && parsed.voice_instruction_id.trim()
            ? parsed.voice_instruction_id.trim()
            : buildVoiceLine(itemName, payout, binPos),
        recycling_tip:
          typeof parsed.recycling_tip === 'string' && parsed.recycling_tip.trim()
            ? parsed.recycling_tip.trim()
            : catalogMatch.recyclingTip,
        source: 'GEMINI_VISION',
      },
      warningMessage: null,
    };
  } catch (err) {
    const localResult = await classifyFromCanvasColorSignature(dataUrl, catalog);
    const reason = err instanceof Error ? err.message : 'Koneksi gagal';
    return {
      result: localResult,
      warningMessage: `Gemini Vision gagal (${reason}). Beralih ke klasifikasi visual lokal.`,
    };
  }
}

export async function verifyGeminiApiKey(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { ok: false, message: 'Masukkan kunci API Gemini terlebih dahulu.' };
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${encodeURIComponent(trimmed)}`,
    );
    if (!res.ok) {
      return { ok: false, message: `Verifikasi ditolak (HTTP ${res.status}). Periksa kunci API.` };
    }
    return { ok: true, message: 'Terhubung ke model gemini-2.5-flash.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Jaringan tidak terjangkau';
    return { ok: false, message: `Gagal menghubungi endpoint Gemini: ${msg}` };
  }
}
