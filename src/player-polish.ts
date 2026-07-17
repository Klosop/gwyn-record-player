export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return String(minutes) + ":" + String(remainder).padStart(2, "0");
}

export function playbackTimeText(
  currentTime: number,
  duration: number,
  hasRecord: boolean,
): string {
  if (!hasRecord) return "--:-- / --:--";
  const total = duration > 0 ? formatPlaybackTime(duration) : "--:--";
  return formatPlaybackTime(Math.max(0, currentTime)) + " / " + total;
}

export function shortestAngleDelta(previousAngle: number, nextAngle: number): number {
  return ((nextAngle - previousAngle + 540) % 360) - 180;
}

export function scrubbedPlaybackTime(
  startTime: number,
  rotationDegrees: number,
  duration: number,
): number {
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, startTime);
  const requestedTime = startTime + (rotationDegrees / 360) * duration;
  return ((requestedTime % duration) + duration) % duration;
}

export interface ActivationResolver {
  activate: () => void;
  cancel: () => void;
}

export function createActivationResolver(
  onSingle: () => void,
  onDouble: () => void,
  delay = 260,
): ActivationResolver {
  let pendingTimer: number | undefined;

  return {
    activate: () => {
      if (pendingTimer !== undefined) {
        globalThis.clearTimeout(pendingTimer);
        pendingTimer = undefined;
        onDouble();
        return;
      }
      pendingTimer = globalThis.setTimeout(() => {
        pendingTimer = undefined;
        onSingle();
      }, delay);
    },
    cancel: () => {
      if (pendingTimer === undefined) return;
      globalThis.clearTimeout(pendingTimer);
      pendingTimer = undefined;
    },
  };
}
