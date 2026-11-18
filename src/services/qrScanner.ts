interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

let cachedDetector: BarcodeDetectorInstance | null = null;

export function isNativeQrDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export async function detectQrCodeFromVideo(video: HTMLVideoElement): Promise<string | null> {
  if (!isNativeQrDetectorSupported() || video.readyState < 2) {
    return null;
  }
  try {
    if (!cachedDetector) {
      const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor })
        .BarcodeDetector;
      cachedDetector = new Detector({ formats: ['qr_code'] });
    }
    const results = await cachedDetector.detect(video);
    return results[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}
