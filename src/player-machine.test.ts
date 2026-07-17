import { describe, expect, it } from "vitest";
import { initialPlayerState, playerReducer } from "./player-machine";

describe("playerReducer", () => {
  it("loads a record and starts it when the arm is placed", () => {
    const loaded = playerReducer(initialPlayerState, { type: "SELECT_RECORD", recordId: "record-01" });
    const playing = playerReducer(loaded, { type: "ARM_TO_RECORD" });

    expect(playing.activeRecordId).toBe("record-01");
    expect(playing.arm).toBe("on-record");
    expect(playing.playback).toBe("playing");
  });

  it("pauses without resetting when the arm returns to rest", () => {
    const playing = {
      ...initialPlayerState,
      activeRecordId: "record-01",
      arm: "on-record" as const,
      playback: "playing" as const,
      currentTime: 42,
    };
    const paused = playerReducer(playing, { type: "ARM_TO_REST" });

    expect(paused.playback).toBe("paused");
    expect(paused.currentTime).toBe(42);
  });

  it("blocks replacement and removal until the arm rests", () => {
    const playing = {
      ...initialPlayerState,
      activeRecordId: "record-01",
      arm: "on-record" as const,
      playback: "playing" as const,
    };

    const replaced = playerReducer(playing, { type: "SELECT_RECORD", recordId: "record-02" });
    const removed = playerReducer(playing, { type: "REMOVE_RECORD" });

    expect(replaced.activeRecordId).toBe("record-01");
    expect(removed.activeRecordId).toBe("record-01");
    expect(replaced.notice).toContain("needle");
  });

  it("returns the arm and resets progress when playback ends", () => {
    const ended = playerReducer(
      {
        ...initialPlayerState,
        activeRecordId: "record-01",
        arm: "on-record",
        playback: "playing",
        currentTime: 120,
      },
      { type: "PLAYBACK_ENDED" },
    );

    expect(ended.arm).toBe("returning");
    expect(ended.playback).toBe("ready");
    expect(ended.currentTime).toBe(0);
  });

  it("clamps volume to the valid audio range", () => {
    expect(playerReducer(initialPlayerState, { type: "SET_VOLUME", volume: 2 }).volume).toBe(1);
    expect(playerReducer(initialPlayerState, { type: "SET_VOLUME", volume: -1 }).volume).toBe(0);
  });
});

