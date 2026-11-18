// Downsampled 64x48 luminance grid keeps frame-diff comparisons under 1ms on mobile CPUs
export const MOTION_WIDTH = 64;
export const MOTION_HEIGHT = 48;

export interface MotionAnalysis {
  scorePercent: number;
  triggered: boolean;
  frameLuma: Uint8ClampedArray;
}

export function computeFrameLuma(
  video: HTMLVideoElement,
  scratchCanvas: HTMLCanvasElement,
): Uint8ClampedArray | null {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }
  scratchCanvas.width = MOTION_WIDTH;
  scratchCanvas.height = MOTION_HEIGHT;
  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, MOTION_WIDTH, MOTION_HEIGHT);
  const { data } = ctx.getImageData(0, 0, MOTION_WIDTH, MOTION_HEIGHT);
  const luma = new Uint8ClampedArray(MOTION_WIDTH * MOTION_HEIGHT);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    luma[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  return luma;
}

export function compareMotionFrames(
  prevLuma: Uint8ClampedArray | null,
  currentLuma: Uint8ClampedArray,
  sensitivityPercent: number,
): MotionAnalysis {
  if (!prevLuma || prevLuma.length !== currentLuma.length) {
    return { scorePercent: 0, triggered: false, frameLuma: currentLuma };
  }

  let changedPixels = 0;
  const pixelThreshold = 26;
  for (let i = 0; i < currentLuma.length; i += 1) {
    if (Math.abs(currentLuma[i] - prevLuma[i]) > pixelThreshold) {
      changedPixels += 1;
    }
  }

  const scorePercent = Math.min(
    100,
    Math.round((changedPixels / currentLuma.length) * 100 * 1.4),
  );
  return {
    scorePercent,
    triggered: scorePercent >= sensitivityPercent,
    frameLuma: currentLuma,
  };
}
