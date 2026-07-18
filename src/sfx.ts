export const SFX_LEVELS = {
  master: 8.64,
  sleeveOpen: 0.5,
  sleeveClose: 0.46,
  drawerOpen: 0.4,
  drawerClose: 0.44,
  recordToSleeve: 0.58,
  recordToPlatter: 0.62,
  sleeveHover: 0.16,
  paperFall: 0.48,
  paperOpen: 0.42,
  paperClose: 0.4,
  tonearmLift: 0.34,
  tonearmDrop: 0.42,
  tonearmRest: 0.36,
  vinylPickup: 0.3,
  vinylScrub: 0.2,
  volumeTick: 0.18,
  unboxOpen: 0.56,
  itemObtained: 0.46,
  emptyTap: 0.26,
  invalidAction: 0.32,
  runout: 0.36,
  dimSwell: 0.28,
} as const;

export type SfxName = Exclude<keyof typeof SFX_LEVELS, "master">;

let context: AudioContext | null = null;
let lastHoverAt = 0;
let lastScrubAt = 0;
let lastVolumeAt = 0;

function audioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;
  context ??= new AudioContextClass();
  return context;
}

function noise(
  ctx: AudioContext,
  start: number,
  duration: number,
  level: number,
  frequency: number,
  type: BiquadFilterType = "bandpass",
): void {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) {
    const fade = 1 - index / frames;
    data[index] = (Math.random() * 2 - 1) * fade;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = type === "bandpass" ? 0.8 : 0.2;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(level, start + Math.min(0.012, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
}

function knock(ctx: AudioContext, start: number, level: number, frequency = 105): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.48), start + 0.09);
  gain.gain.setValueAtTime(level, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.12);
}

export function playSfx(name: SfxName, intensity = 1): void {
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume()
      .then(() => { if (ctx.state === "running") playSfx(name, intensity); })
      .catch(() => undefined);
    return;
  }
  if (ctx.state !== "running") return;

  const nowMs = performance.now();
  if (name === "sleeveHover") {
    if (nowMs - lastHoverAt < 85) return;
    lastHoverAt = nowMs;
  }
  if (name === "vinylScrub") {
    if (nowMs - lastScrubAt < 38) return;
    lastScrubAt = nowMs;
  }
  if (name === "volumeTick") {
    if (nowMs - lastVolumeAt < 32) return;
    lastVolumeAt = nowMs;
  }

  const strength = Math.max(0.15, Math.min(1.4, intensity));
  const level = SFX_LEVELS.master * SFX_LEVELS[name] * strength;
  const now = ctx.currentTime + 0.004;

  switch (name) {
    case "sleeveOpen":
      noise(ctx, now, 0.2, level * 0.18, 1050);
      noise(ctx, now + 0.055, 0.14, level * 0.11, 1900, "highpass");
      break;
    case "sleeveClose":
      noise(ctx, now, 0.16, level * 0.15, 900);
      knock(ctx, now + 0.105, level * 0.09, 145);
      break;
    case "drawerOpen":
      noise(ctx, now, 0.46, level * 0.16, 640);
      noise(ctx, now + 0.08, 0.34, level * 0.09, 1650, "highpass");
      knock(ctx, now + 0.39, level * 0.075, 118);
      break;
    case "drawerClose":
      noise(ctx, now, 0.38, level * 0.15, 590);
      noise(ctx, now + 0.04, 0.28, level * 0.075, 1420, "highpass");
      knock(ctx, now + 0.31, level * 0.13, 104);
      knock(ctx, now + 0.345, level * 0.055, 72);
      break;
    case "recordToSleeve":
      noise(ctx, now, 0.24, level * 0.2, 720);
      noise(ctx, now + 0.08, 0.2, level * 0.12, 1700, "highpass");
      knock(ctx, now + 0.2, level * 0.08, 125);
      break;
    case "recordToPlatter":
      noise(ctx, now, 0.055, level * 0.09, 2200, "highpass");
      knock(ctx, now, level * 0.18, 115);
      knock(ctx, now + 0.035, level * 0.07, 72);
      break;
    case "sleeveHover":
      noise(ctx, now, 0.045, level * 0.11, 2600, "highpass");
      break;
    case "paperFall":
      noise(ctx, now, 0.42, level * 0.16, 1500);
      noise(ctx, now + 0.13, 0.24, level * 0.1, 2600, "highpass");
      knock(ctx, now + 0.34, level * 0.07, 180);
      break;
    case "paperOpen":
      noise(ctx, now, 0.34, level * 0.18, 1750);
      noise(ctx, now + 0.11, 0.26, level * 0.12, 3100, "highpass");
      break;
    case "paperClose":
      noise(ctx, now, 0.27, level * 0.17, 1450);
      noise(ctx, now + 0.08, 0.18, level * 0.1, 2800, "highpass");
      knock(ctx, now + 0.2, level * 0.045, 190);
      break;
    case "tonearmLift":
      noise(ctx, now, 0.045, level * 0.08, 2400, "highpass");
      knock(ctx, now, level * 0.08, 310);
      break;
    case "tonearmDrop":
      knock(ctx, now, level * 0.12, 245);
      noise(ctx, now + 0.012, 0.06, level * 0.07, 3200, "highpass");
      break;
    case "tonearmRest":
      knock(ctx, now, level * 0.11, 185);
      knock(ctx, now + 0.026, level * 0.05, 110);
      break;
    case "vinylPickup":
      noise(ctx, now, 0.12, level * 0.12, 1250);
      noise(ctx, now + 0.025, 0.08, level * 0.07, 2800, "highpass");
      break;
    case "vinylScrub":
      noise(ctx, now, 0.055, level * 0.12, 1150);
      noise(ctx, now, 0.035, level * 0.05, 3600, "highpass");
      break;
    case "volumeTick":
      knock(ctx, now, level * 0.08, 420);
      break;
    case "unboxOpen":
      noise(ctx, now, 0.48, level * 0.18, 780);
      noise(ctx, now + 0.12, 0.32, level * 0.12, 2100, "highpass");
      knock(ctx, now + 0.34, level * 0.07, 135);
      break;
    case "itemObtained": {
      [392, 494, 659].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + index * 0.09;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(level * 0.075, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.5);
      });
      break;
    }
    case "emptyTap":
      knock(ctx, now, level * 0.12, 165);
      noise(ctx, now, 0.05, level * 0.035, 850);
      break;
    case "invalidAction":
      knock(ctx, now, level * 0.11, 120);
      knock(ctx, now + 0.075, level * 0.08, 105);
      break;
    case "runout":
      noise(ctx, now, 0.7, level * 0.1, 1850, "highpass");
      noise(ctx, now + 0.22, 0.5, level * 0.055, 3300, "highpass");
      break;
    case "dimSwell": {
      const oscillator = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(92, now);
      oscillator.frequency.linearRampToValueAtTime(116, now + 1.2);
      filter.type = "lowpass";
      filter.frequency.value = 420;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(level * 0.045, now + 0.48);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      oscillator.connect(filter).connect(gain).connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 1.65);
      break;
    }
  }
}
