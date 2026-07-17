export type ArmState = "resting" | "on-record" | "returning";
export type PlaybackState = "empty" | "ready" | "playing" | "paused" | "error";

export interface PlayerState {
  activeRecordId: string | null;
  arm: ArmState;
  playback: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  notice: string | null;
}

export type PlayerEvent =
  | { type: "SELECT_RECORD"; recordId: string }
  | { type: "REMOVE_RECORD" }
  | { type: "ARM_TO_RECORD" }
  | { type: "ARM_TO_REST" }
  | { type: "AUDIO_READY"; duration: number }
  | { type: "TIME_UPDATE"; currentTime: number; duration: number }
  | { type: "PLAYBACK_ENDED" }
  | { type: "RETURN_COMPLETE" }
  | { type: "AUDIO_ERROR" }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "SHOW_NOTICE"; notice: string }
  | { type: "CLEAR_NOTICE" };

export const initialPlayerState: PlayerState = {
  activeRecordId: null,
  arm: "resting",
  playback: "empty",
  currentTime: 0,
  duration: 0,
  volume: 0.72,
  notice: null,
};

const armFirstNotice = "put the needle back first ♡";

export function playerReducer(state: PlayerState, event: PlayerEvent): PlayerState {
  switch (event.type) {
    case "SELECT_RECORD":
      if (state.arm !== "resting") {
        return { ...state, notice: armFirstNotice };
      }
      return {
        ...state,
        activeRecordId: event.recordId,
        playback: "ready",
        currentTime: 0,
        duration: 0,
        notice: null,
      };

    case "REMOVE_RECORD":
      if (state.arm !== "resting") {
        return { ...state, notice: armFirstNotice };
      }
      return {
        ...state,
        activeRecordId: null,
        playback: "empty",
        currentTime: 0,
        duration: 0,
        notice: null,
      };

    case "ARM_TO_RECORD":
      if (!state.activeRecordId) {
        return { ...state, notice: "choose a record first ♡" };
      }
      if (state.playback === "error") {
        return { ...state, notice: "this song file is missing ♡" };
      }
      return { ...state, arm: "on-record", playback: "playing", notice: null };

    case "ARM_TO_REST":
      return {
        ...state,
        arm: "resting",
        playback: state.activeRecordId && state.playback !== "error" ? "paused" : state.playback,
        notice: null,
      };

    case "AUDIO_READY":
      return { ...state, duration: event.duration, playback: state.playback === "error" ? "ready" : state.playback };

    case "TIME_UPDATE":
      return { ...state, currentTime: event.currentTime, duration: event.duration || state.duration };

    case "PLAYBACK_ENDED":
      return { ...state, arm: "returning", playback: "ready", currentTime: 0 };

    case "RETURN_COMPLETE":
      return { ...state, arm: "resting" };

    case "AUDIO_ERROR":
      return {
        ...state,
        arm: state.arm === "resting" ? "resting" : "returning",
        playback: "error",
        notice: "add the matching MP3 in public/audio ♡",
      };

    case "SET_VOLUME":
      return { ...state, volume: Math.min(1, Math.max(0, event.volume)) };

    case "SHOW_NOTICE":
      return { ...state, notice: event.notice };

    case "CLEAR_NOTICE":
      return { ...state, notice: null };
  }
}

