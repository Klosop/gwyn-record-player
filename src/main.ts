import "./style.css";
import { playSfx } from "./sfx";
import { initialPlayerState, playerReducer, type PlayerEvent, type PlayerState } from "./player-machine";
import {
  createActivationResolver,
  playbackTimeText,
  scrubbedPlaybackTime,
  shortestAngleDelta,
} from "./player-polish";
import {
  DIM_DELAY_SECONDS,
  DIM_FADE_SECONDS,
  ENABLE_VINYL_SHINE,
  SHOW_VINYL_LABEL_TEXT,
  USE_SLEEVE_ART_ON_VINYL_LABEL,
  INTRO_OBTAINED_SECONDS,
  SKIP_UNBOXING_INTRO,
  SLEEVE_OVERLAY_DEFAULTS,
  records,
  type DimWindow,
  type LyricCue,
  type RecordDefinition,
  type SleeveOverlayLayer,
} from "./records";

const asset = (path: string): string => import.meta.env.BASE_URL + path;

document.documentElement.style.setProperty("--dim-delay", String(DIM_DELAY_SECONDS) + "s");
document.documentElement.style.setProperty("--dim-fade-duration", String(DIM_FADE_SECONDS) + "s");
document.body.classList.toggle("has-vinyl-shine", ENABLE_VINYL_SHINE);

function find<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error("Missing " + selector);
  return element;
}

function setupGiftIntro(): void {
  const intro = document.querySelector<HTMLElement>("#gift-intro");
  const box = document.querySelector<HTMLButtonElement>("#intro-box");
  const obtainedMessage = document.querySelector<HTMLElement>(".intro-obtained");
  const app = document.querySelector<HTMLElement>("#app");
  if (!intro || !box || !app) return;
  if (SKIP_UNBOXING_INTRO) {
    intro.remove();
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  obtainedMessage?.removeAttribute("hidden");
  document.body.classList.add("is-intro-active");
  app.inert = true;
  box.focus();

  box.addEventListener("click", () => {
    if (intro.classList.contains("is-opening")) return;
    intro.classList.add("is-opening");
    box.disabled = true;
    playSfx("unboxOpen");

    const obtainedDelay = reducedMotion ? 40 : 780;
    const leaveDelay = reducedMotion ? 100 : obtainedDelay + INTRO_OBTAINED_SECONDS * 1000;
    const removeDelay = reducedMotion ? 180 : leaveDelay + 900;

    window.setTimeout(() => {
      intro.classList.add("is-obtained");
      playSfx("itemObtained");
    }, obtainedDelay);
    window.setTimeout(() => intro.classList.add("is-leaving"), leaveDelay);
    window.setTimeout(() => {
      app.inert = false;
      document.body.classList.remove("is-intro-active");
      intro.remove();
    }, removeDelay);
  });
}

setupGiftIntro();

const stage = find<HTMLDivElement>("#player-stage");
const platter = find<HTMLDivElement>("#platter-zone");
const loadedRecord = find<HTMLButtonElement>("#loaded-record");
const loadedRecordArt = find<HTMLImageElement>("#loaded-record-art");
const recordLabel = find<HTMLSpanElement>("#record-label");
const emptyPlatter = find<HTMLParagraphElement>("#empty-platter");
const tonearm = find<HTMLButtonElement>("#tonearm");
const volume = find<HTMLInputElement>("#volume");
const audio = find<HTMLAudioElement>("#audio-player");
const notice = find<HTMLDivElement>("#notice");
const title = find<HTMLElement>("#track-title");
const artist = find<HTMLElement>("#track-artist");
const playbackStatus = find<HTMLElement>("#playback-status");
const elapsedTime = find<HTMLTimeElement>("#elapsed-time");
const nowPlaying = find<HTMLElement>("#now-playing");
const shelf = find<HTMLElement>("#record-shelf");
const sleeveRow = find<HTMLDivElement>("#sleeve-row");
const lyricLayer = find<HTMLDivElement>("#lyric-layer");
const drawerHandle = find<HTMLButtonElement>("#collection-drawer-handle");

function setRecordDrawerOpen(open: boolean): void {
  document.body.classList.toggle("is-record-drawer-open", open);
  drawerHandle.setAttribute("aria-expanded", String(open));
  const action = drawerHandle.querySelector<HTMLElement>("i");
  if (action) action.textContent = open ? "close" : "open";
}

drawerHandle.addEventListener("click", () => {
  const willOpen = !document.body.classList.contains("is-record-drawer-open");
  if (willOpen) {
    stage.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setRecordDrawerOpen(true), 180);
  } else {
    setRecordDrawerOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setRecordDrawerOpen(false);
});

let state: PlayerState = initialPlayerState;
let noticeTimer: number | undefined;
let returnTimer: number | undefined;
let armDragging = false;
let armMoved = false;
let armLiftSoundPlayed = false;
let armRestSoundTimer: number | undefined;
let armPointerStartX = 0;
let armPointerStartY = 0;
let draggedAngle = 0;
let activeDimWindow: DimWindow | null = null;
let lyricAnimationFrame = 0;
let activeLyricCueKey = "";
let lyricWordElements: HTMLElement[] = [];

const REST_ANGLE = 0;
const PLAY_START = 54;
const PLAY_END = 65;
const ARM_DRAG_DISTANCE = 6;
const sleeveLayers = ["number", "shine", "label"] as const;

function applySleeveOverlay(
  card: HTMLElement,
  record: RecordDefinition,
  layer: (typeof sleeveLayers)[number],
): void {
  const settings: SleeveOverlayLayer = {
    ...SLEEVE_OVERLAY_DEFAULTS[layer],
    ...record.sleeveOverlay?.[layer],
  };
  card.classList.toggle("show-sleeve-" + layer, settings.enabled);
  card.style.setProperty("--sleeve-" + layer + "-x", String(settings.x) + "%");
  card.style.setProperty("--sleeve-" + layer + "-y", String(settings.y) + "%");
  card.style.setProperty("--sleeve-" + layer + "-scale", String(settings.scale));
  card.style.setProperty("--sleeve-" + layer + "-rotation", String(settings.rotation) + "deg");
  card.style.setProperty("--sleeve-" + layer + "-opacity", String(settings.opacity));
}

function applyVinylLabel(label: HTMLElement, record: RecordDefinition): void {
  const useSleeveArt = record.vinylLabel?.useSleeveArt ?? USE_SLEEVE_ART_ON_VINYL_LABEL;
  const showText = record.vinylLabel?.showText ?? SHOW_VINYL_LABEL_TEXT;
  label.classList.toggle("has-album-cover", useSleeveArt);
  label.style.backgroundColor = record.accent;
  label.style.backgroundImage = useSleeveArt ? `url("${asset(record.sleeveSrc)}")` : "none";
  label.style.backgroundPosition = "center";
  label.style.backgroundSize = "cover";
  const text = label.querySelector<HTMLElement>("i");
  if (text) {
    text.textContent = record.labelText;
    text.hidden = !showText;
  }
}

function makeCard(record: RecordDefinition, index: number): HTMLDivElement {
  const card = document.createElement("div");
  card.className = "record-card";
  card.dataset.recordId = record.id;
  card.style.setProperty("--record-color", record.color);
  card.style.setProperty("--record-accent", record.accent);
  card.style.setProperty("--record-number", "'" + String(index + 1).padStart(2, "0") + "'");
  sleeveLayers.forEach((layer) => applySleeveOverlay(card, record, layer));
  const giftNoteMarkup = record.giftMessage
    ? '<button class="gift-note" type="button" tabindex="-1" aria-hidden="true" aria-expanded="false"><i></i></button>'
    : "";
  card.innerHTML =
    '<span class="shelf-vinyl" role="button" tabindex="-1" draggable="false"><img alt=""><span class="vinyl-label"><i></i></span></span>' +
    giftNoteMarkup +
    '<button class="sleeve-art" type="button" aria-expanded="false"><img alt=""><span class="sleeve-fallback" aria-hidden="true"></span><span class="sleeve-overlays" aria-hidden="true"><span class="sleeve-shine"></span><span class="sleeve-number"></span><span class="sleeve-label"><i></i></span></span></button>' +
    '<span class="sleeve-caption"><strong></strong><small></small></span>';

  const images = card.querySelectorAll("img");
  images[0].src = asset(record.vinylSrc);
  images[1].src = asset(record.sleeveSrc);
  images.forEach((image) => {
    image.draggable = false;
    image.addEventListener("error", () => { image.hidden = true; });
  });
  const sleeve = card.querySelector<HTMLButtonElement>(".sleeve-art");
  const vinyl = card.querySelector<HTMLElement>(".shelf-vinyl");
  const vinylLabel = card.querySelector<HTMLElement>(".vinyl-label");
  const strong = card.querySelector("strong");
  const small = card.querySelector("small");
  const sleeveNumber = card.querySelector<HTMLElement>(".sleeve-number");
  const sleeveLabel = card.querySelector<HTMLElement>(".sleeve-label i");
  const giftNote = card.querySelector<HTMLElement>(".gift-note i");
  const giftNoteButton = card.querySelector<HTMLButtonElement>(".gift-note");
  sleeve?.setAttribute(
    "aria-label",
    "Open " + record.title + " by " + record.artist + "; double tap to load",
  );
  vinyl?.setAttribute("aria-label", "Click or drag " + record.title + " onto the record player");
  if (vinylLabel) applyVinylLabel(vinylLabel, record);
  if (strong) strong.textContent = record.title;
  if (small) small.textContent = record.artist;
  if (sleeveNumber) sleeveNumber.textContent = String(index + 1).padStart(2, "0");
  if (sleeveLabel) sleeveLabel.textContent = record.sleeveText;
  if (giftNote) giftNote.textContent = record.giftMessage ?? "";
  giftNoteButton?.setAttribute("aria-label", "Open the crumpled hidden note");
  giftNoteButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !card.classList.contains("is-gift-note-open");
    playSfx(willOpen ? "paperOpen" : "paperClose");
    card.classList.toggle("is-gift-note-open", willOpen);
    giftNoteButton.setAttribute("aria-expanded", String(willOpen));
    giftNoteButton.setAttribute(
      "aria-label",
      willOpen ? "Crumple the hidden note" : "Open the crumpled hidden note",
    );
  });
  return card;
}

records.forEach((record, index) => sleeveRow.append(makeCard(record, index)));
const cards = [...document.querySelectorAll<HTMLDivElement>(".record-card")];

const currentRecord = (): RecordDefinition | null =>
  records.find((record) => record.id === state.activeRecordId) ?? null;

function buildLyricCue(cue: LyricCue): void {
  const line = document.createElement("div");
  line.className = "lyric-line";

  lyricWordElements = cue.words.map((word) => {
    const wordElement = document.createElement("span");
    wordElement.className = "lyric-word";
    wordElement.classList.toggle("is-joined", Boolean(word.join));
    wordElement.dataset.at = String(word.at);

    const measure = document.createElement("span");
    measure.className = "lyric-measure";
    measure.textContent = word.text;
    wordElement.append(measure);

    (["a", "b", "c"] as const).forEach((variant) => {
      const sketch = document.createElement("i");
      sketch.className = "lyric-sketch lyric-sketch-" + variant;
      sketch.textContent = word.text;
      wordElement.append(sketch);
    });

    line.append(wordElement);
    return wordElement;
  });

  lyricLayer.replaceChildren(line);
}

function updateLyricLayer(): void {
  const record = currentRecord();
  const playbackTime = audio.currentTime;
  const cue = state.playback === "playing"
    ? record?.lyrics?.find((item) => playbackTime >= item.start && playbackTime < item.end) ?? null
    : null;

  if (!record || !cue) {
    lyricLayer.classList.remove("is-active");
    activeLyricCueKey = "";
    return;
  }

  const cueKey = record.id + ":" + String(cue.start);
  if (cueKey !== activeLyricCueKey) {
    activeLyricCueKey = cueKey;
    buildLyricCue(cue);
  }

  const rect = stage.getBoundingClientRect();
  const x = Math.max(28, Math.min(window.innerWidth - 28, rect.left + rect.width * ((cue.x ?? 50) / 100)));
  const y = Math.max(28, Math.min(window.innerHeight - 28, rect.top + rect.height * ((cue.y ?? 22) / 100)));
  lyricLayer.style.setProperty("--lyric-x", String(x) + "px");
  lyricLayer.style.setProperty("--lyric-y", String(y) + "px");
  lyricLayer.style.setProperty("--lyric-rotation", String(cue.rotation ?? 0) + "deg");
  lyricLayer.style.setProperty("--lyric-scale", String(cue.scale ?? 1));

  let currentWordIndex = -1;
  lyricWordElements.forEach((wordElement, index) => {
    const isVisible = playbackTime >= Number(wordElement.dataset.at);
    wordElement.classList.toggle("is-visible", isVisible);
    if (isVisible) currentWordIndex = index;
  });
  lyricWordElements.forEach((wordElement, index) => {
    wordElement.classList.toggle("is-current", index === currentWordIndex);
  });
  lyricLayer.classList.add("is-active");
}

function scheduleLyricFrame(): void {
  if (lyricAnimationFrame) return;
  lyricAnimationFrame = window.requestAnimationFrame(() => {
    lyricAnimationFrame = 0;
    updateLyricLayer();
    if (state.playback === "playing" && currentRecord()?.lyrics?.length) {
      scheduleLyricFrame();
    }
  });
}

function updateSpotlight(): void {
  if (!document.body.classList.contains("is-dimmed")) return;
  const rect = stage.getBoundingClientRect();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--spotlight-x", String(rect.left + rect.width / 2) + "px");
  rootStyle.setProperty("--spotlight-y", String(rect.top + rect.height / 2) + "px");
  rootStyle.setProperty("--spotlight-radius-x", String(rect.width * 0.68) + "px");
  rootStyle.setProperty("--spotlight-radius-y", String(rect.height * 0.88) + "px");
}

function armAngle(): number {
  if (state.arm !== "on-record") return REST_ANGLE;
  const progress = state.duration > 0 ? Math.min(1, state.currentTime / state.duration) : 0;
  return PLAY_START + progress * (PLAY_END - PLAY_START);
}

function render(): void {
  const record = currentRecord();
  const timeline = record?.dimTimeline;
  const dimWindow = timeline?.find(
    (window) => state.currentTime >= window.start && state.currentTime < window.end,
  ) ?? null;
  const isInsideDimWindow = timeline?.length ? Boolean(dimWindow) : record?.dim === 1;
  const shouldDim = Boolean(isInsideDimWindow) && state.playback === "playing";
  const wasDimmed = document.body.classList.contains("is-dimmed");
  const fadeDuration = shouldDim
    ? dimWindow?.fadeIn ?? DIM_FADE_SECONDS
    : activeDimWindow?.fadeOut ?? DIM_FADE_SECONDS;
  document.documentElement.style.setProperty("--dim-fade-duration", String(fadeDuration) + "s");
  document.body.classList.toggle("is-dimmed", shouldDim);
  if (shouldDim && !wasDimmed) playSfx("dimSwell");
  activeDimWindow = shouldDim ? dimWindow : null;
  if (shouldDim) updateSpotlight();
  stage.classList.toggle("is-playing", state.playback === "playing");
  stage.classList.toggle("is-paused", state.playback === "paused");
  nowPlaying.classList.toggle("is-playing", state.playback === "playing");
  stage.classList.toggle("has-record", Boolean(record));
  stage.classList.toggle("record-blocked", Boolean(state.notice?.includes("needle")));
  tonearm.classList.toggle("is-returning", state.arm === "returning");
  tonearm.setAttribute("aria-pressed", String(state.arm === "on-record"));
  tonearm.setAttribute("aria-label", state.arm === "on-record"
    ? "Return tonearm to rest and pause"
    : "Move tonearm onto record and play");
  if (!armDragging) tonearm.style.setProperty("--arm-angle", String(armAngle()) + "deg");

  loadedRecord.hidden = !record;
  emptyPlatter.hidden = Boolean(record);
  if (record) {
    loadedRecord.style.setProperty("--record-color", record.color);
    loadedRecord.style.setProperty("--record-accent", record.accent);
    const vinylUrl = asset(record.vinylSrc);
    if (loadedRecordArt.src !== new URL(vinylUrl, document.baseURI).href) {
      loadedRecordArt.src = vinylUrl;
    }
    loadedRecordArt.hidden = loadedRecordArt.dataset.failedSrc === loadedRecordArt.src;
    loadedRecordArt.alt = record.title + " vinyl artwork";
    applyVinylLabel(recordLabel, record);
    title.textContent = record.title;
    artist.textContent = record.artist;
  } else {
    loadedRecordArt.removeAttribute("src");
    title.textContent = "—";
    artist.textContent = "choose one from the shelf";
  }

  const labels: Record<PlayerState["playback"], string> = {
    empty: "waiting for a record",
    ready: "ready for the needle",
    playing: "now spinning",
    paused: "paused",
    error: "song file missing",
  };
  playbackStatus.textContent = labels[state.playback];
  const displayedTime = playbackTimeText(state.currentTime, state.duration, Boolean(record));
  if (elapsedTime.textContent !== displayedTime) elapsedTime.textContent = displayedTime;
  elapsedTime.dateTime = record ? "PT" + String(Math.floor(state.currentTime)) + "S" : "";
  elapsedTime.setAttribute(
    "aria-label",
    record
      ? "Elapsed " + displayedTime.replace(" / ", ", total ")
      : "No playback time available",
  );
  notice.textContent = state.notice ?? "";
  notice.classList.toggle("is-visible", Boolean(state.notice));

  cards.forEach((card) => {
    const selected = card.dataset.recordId === state.activeRecordId;
    const vinyl = card.querySelector<HTMLElement>(".shelf-vinyl");
    const isOpen = card.classList.contains("is-open");
    card.classList.toggle("is-selected", selected);
    if (vinyl) {
      vinyl.draggable = false;
      vinyl.tabIndex = isOpen && !selected ? 0 : -1;
      vinyl.setAttribute("aria-disabled", String(selected));
    }
  });

  audio.volume = state.volume;
  volume.value = String(Math.round(state.volume * 100));
  window.clearTimeout(noticeTimer);
  if (state.notice) {
    noticeTimer = window.setTimeout(() => dispatch({ type: "CLEAR_NOTICE" }), 2600);
  }
  scheduleLyricFrame();
}

let playbackRequestId = 0;
let needleAudioContext: AudioContext | null = null;

function cancelNeedleDrop(): void {
  playbackRequestId += 1;
  audio.muted = false;
}

async function playNeedleCrackle(volumeLevel: number): Promise<void> {
  if (!window.AudioContext) return;
  try {
    needleAudioContext ??= new AudioContext();
    const context = needleAudioContext;
    await context.resume();

    const duration = 0.4;
    const sampleCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      const grain = Math.random() < 0.012 ? 1 : 0.12;
      samples[index] = (Math.random() * 2 - 1) * grain;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    filter.type = "highpass";
    filter.frequency.value = 1250;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volumeLevel * 0.045), now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);

    await new Promise<void>((resolve) => {
      source.addEventListener("ended", () => resolve(), { once: true });
      source.start();
    });
  } catch {
    // The song still starts normally when Web Audio is unavailable or blocked.
  }
}

async function startPlaybackWithNeedleDrop(): Promise<void> {
  const recordId = state.activeRecordId;
  if (!recordId) return;
  const requestId = ++playbackRequestId;
  const resumeTime = audio.currentTime;
  audio.muted = true;

  const playResult = audio.play();
  const [, trackResult] = await Promise.allSettled([
    playNeedleCrackle(state.volume),
    playResult,
  ]);
  const stillCurrent =
    requestId === playbackRequestId &&
    state.activeRecordId === recordId &&
    state.arm === "on-record" &&
    state.playback === "playing";

  if (trackResult.status === "rejected") {
    audio.muted = false;
    if (stillCurrent) dispatch({ type: "AUDIO_ERROR" });
    return;
  }
  if (!stillCurrent) {
    audio.pause();
    audio.muted = false;
    return;
  }

  audio.currentTime = resumeTime;
  audio.muted = false;
  dispatch({ type: "TIME_UPDATE", currentTime: resumeTime, duration: audio.duration });
}

function dispatch(event: PlayerEvent): void {
  const previous = state;
  state = playerReducer(state, event);
  render();

  const wasRejected = Boolean(
    state.notice &&
    state.notice !== previous.notice &&
    ((event.type === "ARM_TO_RECORD" && state.arm === previous.arm) ||
      (event.type === "SELECT_RECORD" && state.activeRecordId === previous.activeRecordId) ||
      (event.type === "REMOVE_RECORD" && state.activeRecordId === previous.activeRecordId))
  );
  if (wasRejected) playSfx("invalidAction");

  if (event.type === "SELECT_RECORD" && state.activeRecordId !== previous.activeRecordId) {
    const record = currentRecord();
    if (record) {
      playSfx("recordToPlatter");
      cancelNeedleDrop();
      audio.pause();
      audio.currentTime = 0;
      loadedRecord.getAnimations().forEach((animation) => { animation.currentTime = 0; });
      loadedRecord.style.removeProperty("rotate");
      loadedRecord.dataset.manualRotation = "0";
      audio.src = asset(record.audioSrc);
      audio.load();
    }
  } else if (event.type === "REMOVE_RECORD" && !state.activeRecordId && previous.activeRecordId) {
    playSfx("recordToSleeve");
    cancelNeedleDrop();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    const returnedCard = cards.find((card) => card.dataset.recordId === previous.activeRecordId);
    if (returnedCard) setSleeveOpen(returnedCard, false);
  } else if (event.type === "ARM_TO_RECORD" && state.playback === "playing") {
    playSfx("tonearmDrop");
    armLiftSoundPlayed = false;
    void startPlaybackWithNeedleDrop();
  } else if (event.type === "ARM_TO_REST") {
    if (previous.arm !== "resting" && !armLiftSoundPlayed) playSfx("tonearmLift");
    armLiftSoundPlayed = false;
    window.clearTimeout(armRestSoundTimer);
    if (previous.arm !== "resting") {
      armRestSoundTimer = window.setTimeout(() => playSfx("tonearmRest"), 720);
    }
    cancelNeedleDrop();
    audio.pause();
  } else if (event.type === "RETURN_COMPLETE") {
    playSfx("tonearmRest");
  } else if (event.type === "PLAYBACK_ENDED" || event.type === "AUDIO_ERROR") {
    cancelNeedleDrop();
    audio.pause();
    window.clearTimeout(returnTimer);
    if (state.arm === "returning") {
      returnTimer = window.setTimeout(() => dispatch({ type: "RETURN_COMPLETE" }), 760);
    }
  }
}

function createVinylDragGhost(
  card: HTMLDivElement,
  vinyl: HTMLElement,
  size: number,
): HTMLDivElement {
  const ghost = document.createElement("div");
  ghost.className = "vinyl-drag-ghost physical-drag-record";
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.setProperty("--record-color", card.style.getPropertyValue("--record-color"));
  ghost.style.setProperty("--record-accent", card.style.getPropertyValue("--record-accent"));
  ghost.style.setProperty("--drag-ghost-size", String(size) + "px");
  const artwork = vinyl.querySelector<HTMLImageElement>("img:not([hidden])");
  if (artwork) {
    const artworkClone = artwork.cloneNode(false) as HTMLImageElement;
    artworkClone.alt = "";
    ghost.append(artworkClone);
  }
  const record = records.find((item) => item.id === card.dataset.recordId);
  const grooves = document.createElement("span");
  grooves.className = "record-grooves";
  const label = document.createElement("span");
  label.className = "record-label";
  const labelText = document.createElement("i");
  label.append(labelText);
  if (record) {
    applyVinylLabel(label, record);
  } else {
    label.style.backgroundColor = card.style.getPropertyValue("--record-accent");
  }
  const hole = document.createElement("span");
  hole.className = "record-hole";
  ghost.append(grooves, label, hole);
  return ghost;
}

function setSleeveOpen(card: HTMLDivElement, open: boolean): void {
  const sleeve = card.querySelector<HTMLButtonElement>(".sleeve-art");
  const vinyl = card.querySelector<HTMLElement>(".shelf-vinyl");
  const giftNote = card.querySelector<HTMLElement>(".gift-note");
  const selected = card.dataset.recordId === state.activeRecordId;
  const wasOpen = card.classList.contains("is-open");
  card.classList.toggle("is-open", open);
  if (wasOpen !== open) playSfx(open ? "sleeveOpen" : "sleeveClose");
  sleeve?.setAttribute("aria-expanded", String(open));
  if (giftNote && open && !card.classList.contains("has-dropped-gift")) {
    card.classList.add("has-dropped-gift");
    sleeveRow.classList.add("has-dropped-gift");
    giftNote.setAttribute("aria-hidden", "false");
    giftNote.tabIndex = 0;
    window.setTimeout(() => playSfx("paperFall"), 160);
  } else if (giftNote && !card.classList.contains("has-dropped-gift")) {
    giftNote.setAttribute("aria-hidden", "true");
    giftNote.tabIndex = -1;
  }
  if (vinyl) {
    vinyl.draggable = false;
    vinyl.tabIndex = open && !selected ? 0 : -1;
  }
}

async function waitForSleevePose(sleeve: HTMLButtonElement): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  const animations = sleeve.getAnimations();
  if (!animations.length) return;
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
}

async function activateSleeveRecord(
  card: HTMLDivElement,
  vinyl: HTMLElement,
  sleeve: HTMLButtonElement,
): Promise<void> {
  if (recordTransitioning) return;
  recordTransitioning = true;
  try {
    if (card.dataset.recordId === state.activeRecordId) {
      await returnLoadedRecordToSleeve();
      return;
    }

    cards.forEach((otherCard) => setSleeveOpen(otherCard, otherCard === card));
    await waitForSleevePose(sleeve);
    if (state.activeRecordId && !(await returnLoadedRecordToSleeve())) return;
    await animateShelfRecordToPlatter(card, vinyl);
  } finally {
    recordTransitioning = false;
  }
}

cards.forEach((card) => {
  const sleeve = card.querySelector<HTMLButtonElement>(".sleeve-art");
  const vinyl = card.querySelector<HTMLElement>(".shelf-vinyl");
  if (!sleeve || !vinyl) return;

  const sleeveActivation = createActivationResolver(
    () => {
      if (recordTransitioning) return;
      const willOpen = !card.classList.contains("is-open");
      if (willOpen) cards.forEach((otherCard) => setSleeveOpen(otherCard, false));
      setSleeveOpen(card, willOpen);
    },
    () => { void activateSleeveRecord(card, vinyl, sleeve); },
  );
  sleeve.addEventListener("click", (event) => {
    event.preventDefault();
    sleeveActivation.activate();
  });
  sleeve.addEventListener("dblclick", (event) => event.preventDefault());
  sleeve.addEventListener("pointerenter", () => playSfx("sleeveHover"));

  installPhysicalDrag(vinyl, card);
  vinyl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const recordId = card.dataset.recordId;
    if (recordId && recordId !== state.activeRecordId) {
      void transitionToShelfRecord(card, vinyl);
    }
  });
});

platter.addEventListener("dragover", (event) => {
  event.preventDefault();
  platter.classList.add("is-drag-over");
});
platter.addEventListener("dragleave", () => platter.classList.remove("is-drag-over"));
platter.addEventListener("click", () => {
  if (!state.activeRecordId) playSfx("emptyTap");
});
platter.addEventListener("drop", (event) => {
  event.preventDefault();
  platter.classList.remove("is-drag-over");
  const recordId = event.dataTransfer?.getData("text/record-id");
  if (recordId) dispatch({ type: "SELECT_RECORD", recordId });
});

shelf.addEventListener("dragover", (event) => event.preventDefault());
shelf.addEventListener("drop", (event) => {
  if (event.dataTransfer?.getData("text/loaded-record") === "true") {
    event.preventDefault();
    dispatch({ type: "REMOVE_RECORD" });
  }
});

loadedRecord.draggable = false;
installLoadedRecordDrag();
loadedRecordArt.addEventListener("error", () => {
  loadedRecordArt.dataset.failedSrc = loadedRecordArt.src;
  loadedRecordArt.hidden = true;
});

volume.addEventListener("input", () => {
  const nextVolume = Number(volume.value) / 100;
  const endpointStrength = nextVolume === 0 || nextVolume === 1 ? 1.35 : 0.72;
  playSfx("volumeTick", endpointStrength);
  dispatch({ type: "SET_VOLUME", volume: nextVolume });
});
audio.addEventListener("loadedmetadata", () => {
  dispatch({ type: "AUDIO_READY", duration: audio.duration });
});
audio.addEventListener("timeupdate", () => {
  if (state.playback === "playing") {
    dispatch({ type: "TIME_UPDATE", currentTime: audio.currentTime, duration: audio.duration });
  }
});
audio.addEventListener("ended", () => {
  playSfx("runout");
  dispatch({ type: "PLAYBACK_ENDED" });
});
audio.addEventListener("error", () => {
  if (state.activeRecordId) dispatch({ type: "AUDIO_ERROR" });
});

function pointerAngle(event: PointerEvent): number {
  const parentRect = tonearm.offsetParent?.getBoundingClientRect();
  if (!parentRect) return REST_ANGLE;
  const pivotX = parentRect.left + tonearm.offsetLeft + tonearm.offsetWidth / 2;
  const pivotY = parentRect.top + tonearm.offsetTop + tonearm.offsetHeight * 0.1;
  const angle = Math.atan2(pivotX - event.clientX, event.clientY - pivotY) * 180 / Math.PI;
  return Math.max(REST_ANGLE, Math.min(PLAY_END + 3, angle));
}

tonearm.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.preventDefault();
  armLiftSoundPlayed = true;
  playSfx("tonearmLift");
  armDragging = true;
  armMoved = false;
  armPointerStartX = event.clientX;
  armPointerStartY = event.clientY;
  draggedAngle = armAngle();
  tonearm.classList.add("is-dragging");
  tonearm.setPointerCapture(event.pointerId);
});
tonearm.addEventListener("pointermove", (event) => {
  if (!armDragging) return;
  if (!armMoved) {
    const distance = Math.hypot(
      event.clientX - armPointerStartX,
      event.clientY - armPointerStartY,
    );
    if (distance < ARM_DRAG_DISTANCE) return;
    armMoved = true;
    stage.classList.add("is-arm-dragging");
    audio.pause();
  }
  draggedAngle = pointerAngle(event);
  tonearm.style.setProperty("--arm-angle", String(draggedAngle) + "deg");
});

function finishArm(event: PointerEvent): void {
  if (!armDragging) return;
  const wasMoved = armMoved;
  armDragging = false;
  armMoved = false;
  tonearm.classList.remove("is-dragging");
  stage.classList.remove("is-arm-dragging");
  if (tonearm.hasPointerCapture(event.pointerId)) tonearm.releasePointerCapture(event.pointerId);

  if (!wasMoved) {
    if (event.type !== "pointercancel") {
      dispatch(state.arm === "on-record" ? { type: "ARM_TO_REST" } : { type: "ARM_TO_RECORD" });
    }
    return;
  }

  dispatch(draggedAngle >= PLAY_START - 30 ? { type: "ARM_TO_RECORD" } : { type: "ARM_TO_REST" });
}
tonearm.addEventListener("pointerup", finishArm);
tonearm.addEventListener("pointercancel", finishArm);
tonearm.addEventListener("click", (event) => {
  if (event.detail !== 0) return;
  dispatch(state.arm === "on-record" ? { type: "ARM_TO_REST" } : { type: "ARM_TO_RECORD" });
});

let recordTransitioning = false;

function transformAt(rect: DOMRect, size: number, scale = rect.width / size): string {
  const left = window.scrollX + rect.left + rect.width / 2 - size / 2;
  const top = window.scrollY + rect.top + rect.height / 2 - size / 2;
  return (
    "translate3d(" + String(left) + "px," + String(top) + "px,0) " +
    "rotate(0deg) scale(" + String(scale) + ")"
  );
}

async function animateGhostToSleeve(
  activeGhost: HTMLDivElement,
  card: HTMLDivElement,
  fromTransform: string,
  size: number,
): Promise<void> {
  const sleeve = card.querySelector<HTMLButtonElement>(".sleeve-art");
  if (!sleeve) {
    activeGhost.remove();
    return;
  }

  const sleeveRect = sleeve.getBoundingClientRect();
  const targetScale = Math.min(sleeveRect.width, sleeveRect.height) * 0.82 / size;
  const toTransform = transformAt(sleeveRect, size, targetScale);
  stage.classList.add("is-loaded-record-moving");
  card.classList.add("is-vinyl-dragging");
  document.body.classList.add("is-record-dragging");

  try {
    const returnAnimation = activeGhost.animate(
      [{ transform: fromTransform, opacity: 1 }, { transform: toTransform, opacity: 1 }],
      { duration: 430, easing: "cubic-bezier(.2,.8,.25,1)", fill: "forwards" },
    );
    await returnAnimation.finished;
    dispatch({ type: "REMOVE_RECORD" });
    const fadeAnimation = activeGhost.animate(
      [{ transform: toTransform, opacity: 1 }, { transform: toTransform, opacity: 0 }],
      { duration: 150, easing: "ease-out", fill: "forwards" },
    );
    await fadeAnimation.finished;
  } finally {
    activeGhost.remove();
    stage.classList.remove("is-loaded-record-moving");
    card.classList.remove("is-vinyl-dragging");
    document.body.classList.remove("is-record-dragging");
  }
}

async function returnLoadedRecordToSleeve(): Promise<boolean> {
  const recordId = state.activeRecordId;
  if (!recordId) return true;
  if (state.arm !== "resting") {
    dispatch({ type: "REMOVE_RECORD" });
    return false;
  }

  const card = cards.find((item) => item.dataset.recordId === recordId);
  const vinyl = card?.querySelector<HTMLElement>(".shelf-vinyl");
  if (!card || !vinyl) return false;
  const sourceRect = loadedRecord.getBoundingClientRect();
  const size = sourceRect.width;
  const activeGhost = createVinylDragGhost(card, vinyl, size);
  const fromTransform = transformAt(sourceRect, size, 1);
  activeGhost.style.transform = fromTransform;
  document.body.append(activeGhost);
  await animateGhostToSleeve(activeGhost, card, fromTransform, size);
  return true;
}

async function animateShelfRecordToPlatter(
  card: HTMLDivElement,
  vinyl: HTMLElement,
): Promise<void> {
  const recordId = card.dataset.recordId;
  if (!recordId || recordId === state.activeRecordId) return;
  const shelfRect = vinyl.getBoundingClientRect();
  const platterRect = platter.getBoundingClientRect();
  const size = platterRect.width * 0.83;
  const fromTransform = transformAt(shelfRect, size);
  const targetRect = new DOMRect(
    platterRect.left + platterRect.width / 2 - size / 2,
    platterRect.top + platterRect.height / 2 - size / 2,
    size,
    size,
  );
  const toTransform = transformAt(targetRect, size, 1);
  const activeGhost = createVinylDragGhost(card, vinyl, size);
  activeGhost.style.transform = fromTransform;
  document.body.append(activeGhost);
  card.classList.add("is-vinyl-dragging");
  document.body.classList.add("is-record-dragging");

  try {
    const snapAnimation = activeGhost.animate(
      [{ transform: fromTransform, opacity: 1 }, { transform: toTransform, opacity: 1 }],
      { duration: 430, easing: "cubic-bezier(.2,.8,.25,1)", fill: "forwards" },
    );
    await snapAnimation.finished;
    dispatch({ type: "SELECT_RECORD", recordId });
    const fadeAnimation = activeGhost.animate(
      [{ transform: toTransform, opacity: 1 }, { transform: toTransform, opacity: 0 }],
      { duration: 190, easing: "ease-out", fill: "forwards" },
    );
    await fadeAnimation.finished;
  } finally {
    activeGhost.remove();
    card.classList.remove("is-vinyl-dragging");
    document.body.classList.remove("is-record-dragging");
  }
}

async function transitionToShelfRecord(
  card: HTMLDivElement,
  vinyl: HTMLElement,
): Promise<void> {
  if (recordTransitioning || card.dataset.recordId === state.activeRecordId) return;
  recordTransitioning = true;
  try {
    if (state.activeRecordId && !(await returnLoadedRecordToSleeve())) return;
    await animateShelfRecordToPlatter(card, vinyl);
  } finally {
    recordTransitioning = false;
  }
}

async function transitionDraggedRecordToPlatter(
  activeGhost: HTMLDivElement,
  card: HTMLDivElement,
  waitingTransform: string,
  size: number,
): Promise<void> {
  try {
    if (state.activeRecordId && !(await returnLoadedRecordToSleeve())) return;

    const recordId = card.dataset.recordId;
    if (!recordId) return;
    const platterRect = platter.getBoundingClientRect();
    const targetRect = new DOMRect(
      platterRect.left + platterRect.width / 2 - size / 2,
      platterRect.top + platterRect.height / 2 - size / 2,
      size,
      size,
    );
    const toTransform = transformAt(targetRect, size, 1);
    document.body.classList.add("is-record-dragging");
    const snapAnimation = activeGhost.animate(
      [{ transform: waitingTransform, opacity: 1 }, { transform: toTransform, opacity: 1 }],
      { duration: 340, easing: "cubic-bezier(.2,.8,.25,1)", fill: "forwards" },
    );
    await snapAnimation.finished;
    dispatch({ type: "SELECT_RECORD", recordId });
    const fadeAnimation = activeGhost.animate(
      [{ transform: toTransform, opacity: 1 }, { transform: toTransform, opacity: 0 }],
      { duration: 190, easing: "ease-out", fill: "forwards" },
    );
    await fadeAnimation.finished;
  } finally {
    activeGhost.remove();
    card.classList.remove("is-vinyl-dragging");
    document.body.classList.remove("is-record-dragging");
    recordTransitioning = false;
  }
}

function installLoadedRecordDrag(): void {
  type LoadedInteraction = "pickup" | "scrub" | null;

  let pointerId: number | null = null;
  let interaction: LoadedInteraction = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let sourceRect: DOMRect | null = null;
  let ghost: HTMLDivElement | null = null;
  let sourceCard: HTMLDivElement | null = null;
  let currentTransform = "";
  let dragged = false;
  let suppressScrubClick = false;
  let scrubWasPlaying = false;
  let scrubStartTime = 0;
  let scrubLastAngle = 0;
  let scrubRotation = 0;
  let spinAnimationStart = 0;
  let manualRotationStart = 0;

  const overPlatter = (x: number, y: number): boolean =>
    Boolean(document.elementFromPoint(x, y)?.closest("[data-drop-zone='platter']"));

  const pointerRecordAngle = (event: PointerEvent, rect: DOMRect): number =>
    Math.atan2(
      event.clientY - (rect.top + rect.height / 2),
      event.clientX - (rect.left + rect.width / 2),
    ) * 180 / Math.PI;

  loadedRecord.addEventListener("pointerdown", (event) => {
    if (
      (event.pointerType === "mouse" && event.button !== 0) ||
      !state.activeRecordId ||
      recordTransitioning
    ) return;

    const target = event.target as Element;
    const pickupFromLabel = Boolean(target.closest(".record-label"));
    if (pickupFromLabel && state.arm !== "resting") {
      dispatch({ type: "REMOVE_RECORD" });
      return;
    }

    sourceRect = loadedRecord.getBoundingClientRect();
    event.preventDefault();
    pointerId = event.pointerId;
    loadedRecord.setPointerCapture(event.pointerId);

    if (!pickupFromLabel) {
      interaction = "scrub";
      suppressScrubClick = true;
      scrubWasPlaying = state.playback === "playing" && state.arm === "on-record";
      scrubStartTime = audio.currentTime;
      scrubLastAngle = pointerRecordAngle(event, sourceRect);
      scrubRotation = 0;
      const spinAnimation = loadedRecord.getAnimations()[0];
      spinAnimationStart = Number(spinAnimation?.currentTime ?? 0);
      manualRotationStart = Number(loadedRecord.dataset.manualRotation ?? 0);
      cancelNeedleDrop();
      audio.pause();
      stage.classList.add("is-scrubbing");
      return;
    }

    interaction = "pickup";
    sourceCard = cards.find((card) => card.dataset.recordId === state.activeRecordId) ?? null;
    if (!sourceCard) {
      interaction = null;
      return;
    }
    dragged = false;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
  });

  loadedRecord.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId || !sourceRect) return;

    if (interaction === "scrub") {
      event.preventDefault();
      const nextAngle = pointerRecordAngle(event, sourceRect);
      const angleDelta = shortestAngleDelta(scrubLastAngle, nextAngle);
      scrubRotation += angleDelta;
      scrubLastAngle = nextAngle;
      playSfx("vinylScrub", Math.min(1.4, Math.abs(angleDelta) / 7));
      const duration = state.duration > 0 ? state.duration : audio.duration;
      const nextTime = scrubbedPlaybackTime(scrubStartTime, scrubRotation, duration);
      if (Number.isFinite(nextTime)) {
        audio.currentTime = nextTime;
        dispatch({ type: "TIME_UPDATE", currentTime: nextTime, duration });
      }

      const spinAnimation = loadedRecord.getAnimations()[0];
      if (spinAnimation) {
        const animationTime = spinAnimationStart + (scrubRotation / 360) * 2800;
        spinAnimation.currentTime = ((animationTime % 2800) + 2800) % 2800;
      } else {
        const manualRotation = manualRotationStart + scrubRotation;
        loadedRecord.style.rotate = String(manualRotation) + "deg";
        loadedRecord.dataset.manualRotation = String(manualRotation);
      }
      return;
    }

    if (interaction !== "pickup" || !sourceCard) return;
    if (!ghost && Math.hypot(event.clientX - startX, event.clientY - startY) >= 5) {
      const vinyl = sourceCard.querySelector<HTMLElement>(".shelf-vinyl");
      if (!vinyl) return;
      dragged = true;
      recordTransitioning = true;
      ghost = createVinylDragGhost(sourceCard, vinyl, sourceRect.width);
      playSfx("vinylPickup");
      document.body.append(ghost);
      stage.classList.add("is-loaded-record-moving");
      document.body.classList.add("is-record-dragging");
    }
    if (!ghost) return;

    event.preventDefault();
    const tilt = Math.max(-11, Math.min(11, (event.clientX - lastX) * 1.35));
    const left = window.scrollX + event.clientX - sourceRect.width / 2;
    const top = window.scrollY + event.clientY - sourceRect.height / 2;
    currentTransform =
      "translate3d(" + String(left) + "px," + String(top) + "px,0) " +
      "rotate(" + String(tilt) + "deg) scale(1.04)";
    ghost.style.transform = currentTransform;
    lastX = event.clientX;
  });

  const finish = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    if (loadedRecord.hasPointerCapture(event.pointerId)) {
      loadedRecord.releasePointerCapture(event.pointerId);
    }
    pointerId = null;

    if (interaction === "scrub") {
      interaction = null;
      sourceRect = null;
      stage.classList.remove("is-scrubbing");
      if (
        event.type === "pointerup" &&
        scrubWasPlaying &&
        state.playback === "playing" &&
        state.arm === "on-record"
      ) {
        void audio.play().catch(() => dispatch({ type: "AUDIO_ERROR" }));
      }
      return;
    }
    interaction = null;

    if (!ghost || !sourceRect || !sourceCard) {
      ghost = null;
      sourceRect = null;
      sourceCard = null;
      return;
    }

    const activeGhost = ghost;
    const card = sourceCard;
    const fromTransform = currentTransform;
    const size = sourceRect.width;
    const returnToSleeve = event.type === "pointerup" && !overPlatter(event.clientX, event.clientY);
    ghost = null;
    sourceRect = null;
    sourceCard = null;

    if (returnToSleeve) {
      void animateGhostToSleeve(activeGhost, card, fromTransform, size)
        .finally(() => { recordTransitioning = false; });
      return;
    }

    const platterTransform = transformAt(loadedRecord.getBoundingClientRect(), size, 1);
    const snapAnimation = activeGhost.animate(
      [{ transform: fromTransform, opacity: 1 }, { transform: platterTransform, opacity: 1 }],
      { duration: 260, easing: "cubic-bezier(.2,.8,.25,1)", fill: "forwards" },
    );
    const settle = (): void => {
      activeGhost.remove();
      stage.classList.remove("is-loaded-record-moving");
      document.body.classList.remove("is-record-dragging");
      recordTransitioning = false;
    };
    void snapAnimation.finished.then(settle, settle);
  };

  loadedRecord.addEventListener("pointerup", finish);
  loadedRecord.addEventListener("pointercancel", finish);
  loadedRecord.addEventListener("click", (event) => {
    if (dragged || suppressScrubClick) {
      dragged = false;
      suppressScrubClick = false;
      return;
    }

    const target = event.target as Element;
    if (event.detail !== 0 && !target.closest(".record-label")) return;
    if (!state.activeRecordId || recordTransitioning) return;
    recordTransitioning = true;
    void returnLoadedRecordToSleeve()
      .finally(() => { recordTransitioning = false; });
  });
}

function installPhysicalDrag(vinyl: HTMLElement, card: HTMLDivElement): void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let sourceRect: DOMRect | null = null;
  let ghost: HTMLDivElement | null = null;
  let ghostSize = 0;
  let currentTransform = "";
  let dragged = false;

  const overPlatter = (x: number, y: number): boolean =>
    Boolean(document.elementFromPoint(x, y)?.closest("[data-drop-zone='platter']"));

  const moveGhost = (event: PointerEvent): void => {
    if (!ghost || !sourceRect || ghostSize <= 0) return;
    const tilt = Math.max(-11, Math.min(11, (event.clientX - lastX) * 1.35));
    const heldScale = (sourceRect.width / ghostSize) * 1.04;
    const left = window.scrollX + event.clientX - ghostSize / 2;
    const top = window.scrollY + event.clientY - ghostSize / 2;
    currentTransform =
      "translate3d(" + String(left) + "px," + String(top) + "px,0) " +
      "rotate(" + String(tilt) + "deg) scale(" + String(heldScale) + ")";
    ghost.style.transform = currentTransform;
    lastX = event.clientX;
    platter.classList.toggle("is-drag-over", overPlatter(event.clientX, event.clientY));
  };

  vinyl.addEventListener("pointerdown", (event) => {
    if (
      (event.pointerType === "mouse" && event.button !== 0) ||
      recordTransitioning ||
      !card.classList.contains("is-open") ||
      card.dataset.recordId === state.activeRecordId
    ) return;
    event.preventDefault();
    dragged = false;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    sourceRect = vinyl.getBoundingClientRect();
    vinyl.setPointerCapture(event.pointerId);
  });

  vinyl.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId || !sourceRect) return;
    if (!ghost && Math.hypot(event.clientX - startX, event.clientY - startY) >= 5) {
      dragged = true;
      ghostSize = platter.getBoundingClientRect().width * 0.83;
      ghost = createVinylDragGhost(card, vinyl, ghostSize);
      playSfx("vinylPickup");
      document.body.append(ghost);
      card.classList.add("is-vinyl-dragging");
      document.body.classList.add("is-record-dragging");
    }
    if (ghost) {
      event.preventDefault();
      moveGhost(event);
    }
  });

  const finish = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    if (vinyl.hasPointerCapture(event.pointerId)) vinyl.releasePointerCapture(event.pointerId);
    pointerId = null;
    platter.classList.remove("is-drag-over");

    if (!ghost || !sourceRect) {
      ghost = null;
      ghostSize = 0;
      sourceRect = null;
      return;
    }

    const activeGhost = ghost;
    const activeGhostSize = ghostSize;
    const fromTransform = currentTransform;
    const droppedOnPlatter = event.type === "pointerup" && overPlatter(event.clientX, event.clientY);
    const replacingLoadedRecord = Boolean(
      droppedOnPlatter &&
      state.activeRecordId &&
      state.activeRecordId !== card.dataset.recordId
    );
    let toTransform: string;
    let duration: number;

    if (replacingLoadedRecord) {
      const platterRect = platter.getBoundingClientRect();
      const visualHalf = ghostSize * 0.36;
      const waitingCenterX = Math.max(
        visualHalf + 12,
        Math.min(window.innerWidth - visualHalf - 12, platterRect.right + visualHalf * 0.72),
      );
      const waitingCenterY = Math.max(
        visualHalf + 12,
        platterRect.top + visualHalf * 0.35,
      );
      const waitingRect = new DOMRect(
        waitingCenterX - ghostSize / 2,
        waitingCenterY - ghostSize / 2,
        ghostSize,
        ghostSize,
      );
      toTransform = transformAt(waitingRect, ghostSize, 0.72);
      duration = 240;
      recordTransitioning = true;
    } else if (droppedOnPlatter) {
      const platterRect = platter.getBoundingClientRect();
      const targetLeft =
        window.scrollX + platterRect.left + platterRect.width / 2 - ghostSize / 2;
      const targetTop =
        window.scrollY + platterRect.top + platterRect.height / 2 - ghostSize / 2;
      toTransform =
        "translate3d(" + String(targetLeft) + "px," + String(targetTop) + "px,0) " +
        "rotate(0deg) scale(1)";
      duration = 280;
    } else {
      const returnRect = vinyl.getBoundingClientRect();
      const returnScale = returnRect.width / ghostSize;
      toTransform = transformAt(returnRect, ghostSize, returnScale);
      duration = 220;
    }

    ghost = null;
    ghostSize = 0;
    sourceRect = null;
    const snapAnimation = activeGhost.animate(
      [{ transform: fromTransform, opacity: 1 }, { transform: toTransform, opacity: 1 }],
      { duration, easing: "cubic-bezier(.2,.8,.25,1)", fill: "forwards" },
    );

    const settle = (): void => {
      activeGhost.remove();
      card.classList.remove("is-vinyl-dragging");
      document.body.classList.remove("is-record-dragging");
    };

    if (replacingLoadedRecord) {
      void snapAnimation.finished.then(
        () => transitionDraggedRecordToPlatter(
          activeGhost,
          card,
          toTransform,
          activeGhostSize,
        ),
        () => {
          settle();
          recordTransitioning = false;
        },
      );
    } else if (droppedOnPlatter) {
      void snapAnimation.finished.then(() => {
        const recordId = card.dataset.recordId;
        if (recordId) dispatch({ type: "SELECT_RECORD", recordId });
        const fadeAnimation = activeGhost.animate(
          [{ transform: toTransform, opacity: 1 }, { transform: toTransform, opacity: 0 }],
          { duration: 190, easing: "ease-out", fill: "forwards" },
        );
        return fadeAnimation.finished;
      }).then(settle, settle);
    } else {
      void snapAnimation.finished.then(settle, settle);
    }
  };

  vinyl.addEventListener("pointerup", finish);
  vinyl.addEventListener("pointercancel", finish);
  vinyl.addEventListener("click", (event) => {
    if (dragged) {
      dragged = false;
      return;
    }
    if (
      !card.classList.contains("is-open") ||
      card.dataset.recordId === state.activeRecordId ||
      recordTransitioning
    ) return;
    event.preventDefault();
    void transitionToShelfRecord(card, vinyl);
  });
}

window.addEventListener("resize", updateSpotlight);
window.addEventListener("scroll", updateSpotlight, { passive: true });

render();
