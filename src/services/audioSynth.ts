import type { BinPosition } from '../types/sorta';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => undefined);
  }
  return sharedAudioCtx;
}

function playTone(
  ctx: AudioContext,
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  type: OscillatorType,
  gainPeak: number,
  delaySec = 0,
): void {
  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), start + durationSec);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(gainPeak, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationSec + 0.01);
}

// Synthesize crisp tactile switch click inspired by portable hardware instruments
export function playTactileClick(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  playTone(ctx, 1650, 520, 0.022, 'triangle', 0.08);
}

export function playScanLockBeep(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  playTone(ctx, 880, 880, 0.06, 'sine', 0.09, 0);
  playTone(ctx, 1320, 1320, 0.08, 'sine', 0.1, 0.075);
}

export function playClassificationCue(binPosition: BinPosition, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (binPosition === 'CENTER') {
    playTone(ctx, 784, 784, 0.08, 'triangle', 0.11, 0);
    playTone(ctx, 987.77, 987.77, 0.08, 'triangle', 0.11, 0.07);
    playTone(ctx, 1318.5, 1318.5, 0.15, 'sine', 0.13, 0.14);
    return;
  }

  if (binPosition === 'LEFT') {
    playTone(ctx, 523.25, 523.25, 0.09, 'sine', 0.11, 0);
    playTone(ctx, 659.25, 659.25, 0.14, 'sine', 0.12, 0.09);
    return;
  }

  playTone(ctx, 310, 260, 0.08, 'sawtooth', 0.06, 0);
  playTone(ctx, 240, 190, 0.1, 'sawtooth', 0.06, 0.1);
}

export function playCommitSuccessChime(hasCashValue: boolean, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (hasCashValue) {
    playTone(ctx, 1046.5, 1046.5, 0.07, 'sine', 0.1, 0);
    playTone(ctx, 1318.5, 1318.5, 0.07, 'sine', 0.1, 0.065);
    playTone(ctx, 1567.98, 1567.98, 0.08, 'sine', 0.11, 0.13);
    playTone(ctx, 2093.0, 2093.0, 0.22, 'triangle', 0.12, 0.2);
    return;
  }

  playTone(ctx, 587.33, 587.33, 0.08, 'sine', 0.09, 0);
  playTone(ctx, 783.99, 783.99, 0.14, 'sine', 0.1, 0.085);
}

export function stopSpeechGuidance(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

export function speakInstructionId(text: string, enabled = true): boolean {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice =
      voices.find((v) => v.lang.toLowerCase() === 'id-id') ??
      voices.find((v) => v.lang.toLowerCase().startsWith('id'));
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }
    utterance.lang = 'id-ID';
    utterance.rate = 1.03;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
