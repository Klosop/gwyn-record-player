import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createActivationResolver,
  formatPlaybackTime,
  playbackTimeText,
  scrubbedPlaybackTime,
  shortestAngleDelta,
} from "./player-polish";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatPlaybackTime", () => {
  it.each([
    [Number.NaN, "--:--"],
    [-1, "--:--"],
    [0, "0:00"],
    [59.9, "0:59"],
    [60, "1:00"],
    [3661, "61:01"],
  ])("formats %s as %s", (seconds, expected) => {
    expect(formatPlaybackTime(seconds)).toBe(expected);
  });

  it("shows distinct empty, loading, and ready states", () => {
    expect(playbackTimeText(0, 0, false)).toBe("--:-- / --:--");
    expect(playbackTimeText(0, 0, true)).toBe("0:00 / --:--");
    expect(playbackTimeText(68, 222, true)).toBe("1:08 / 3:42");
  });
});

describe("circular record scrubbing", () => {
  it("uses the shortest angular path across the zero-degree boundary", () => {
    expect(shortestAngleDelta(350, 10)).toBe(20);
    expect(shortestAngleDelta(10, 350)).toBe(-20);
    expect(shortestAngleDelta(45, 90)).toBe(45);
  });

  it("wraps manual rotation across both ends of the track", () => {
    expect(scrubbedPlaybackTime(60, 180, 240)).toBe(180);
    expect(scrubbedPlaybackTime(0, -90, 240)).toBe(180);
    expect(scrubbedPlaybackTime(230, 30, 240)).toBe(10);
    expect(scrubbedPlaybackTime(60, 720, 240)).toBe(60);
  });
});

describe("createActivationResolver", () => {
  it("runs one delayed single activation", () => {
    vi.useFakeTimers();
    const onSingle = vi.fn();
    const onDouble = vi.fn();
    const resolver = createActivationResolver(onSingle, onDouble);

    resolver.activate();
    vi.advanceTimersByTime(259);
    expect(onSingle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSingle).toHaveBeenCalledOnce();
    expect(onDouble).not.toHaveBeenCalled();
  });

  it("turns two activations into one double activation", () => {
    vi.useFakeTimers();
    const onSingle = vi.fn();
    const onDouble = vi.fn();
    const resolver = createActivationResolver(onSingle, onDouble);

    resolver.activate();
    resolver.activate();
    vi.runAllTimers();

    expect(onSingle).not.toHaveBeenCalled();
    expect(onDouble).toHaveBeenCalledOnce();
  });
});
