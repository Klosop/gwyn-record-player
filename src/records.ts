export interface SleeveOverlayLayer {
  enabled: boolean;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface SleeveOverlaySettings {
  number?: Partial<SleeveOverlayLayer>;
  shine?: Partial<SleeveOverlayLayer>;
  label?: Partial<SleeveOverlayLayer>;
}

export const SLEEVE_OVERLAY_DEFAULTS = {
  number: { enabled: true, x: 9, y: 7, scale: 1, rotation: 0, opacity: 1 },
  shine: { enabled: true, x: 50, y: 50, scale: 1, rotation: 0, opacity: 0.72 },
  // Label x/y are offsets from the right and bottom, matching the original sleeve layout.
  label: { enabled: false, x: 8, y: 8, scale: 1, rotation: 0, opacity: 1 },
} satisfies Record<"number" | "shine" | "label", SleeveOverlayLayer>;

export const DIM_DELAY_SECONDS = 0;
export const DIM_FADE_SECONDS = 4;
export const ENABLE_VINYL_SHINE = true;
export const USE_SLEEVE_ART_ON_VINYL_LABEL = true;
export const SHOW_VINYL_LABEL_TEXT = true;
export const SKIP_UNBOXING_INTRO = true;
export const INTRO_OBTAINED_SECONDS = 2.8;

export interface DimWindow {
  start: number;
  end: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface LyricWord {
  text: string;
  at: number;
  join?: boolean;
}

export interface LyricCue {
  start: number;
  end: number;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  words: readonly LyricWord[];
}

export interface VinylLabelSettings {
  /** Override USE_SLEEVE_ART_ON_VINYL_LABEL for this record. */
  useSleeveArt?: boolean;
  /** Override SHOW_VINYL_LABEL_TEXT for this record. */
  showText?: boolean;
}

export interface RecordDefinition {
  id: string;
  title: string;
  artist: string;
  sleeveText: string;
  labelText: string;
  giftMessage?: string;
  dim: 0 | 1;
  dimTimeline?: readonly DimWindow[];
  lyrics?: readonly LyricCue[];
  sleeveOverlay?: SleeveOverlaySettings;
  // Example: vinylLabel: { useSleeveArt: false, showText: false }
  vinylLabel?: VinylLabelSettings;
  sleeveSrc: string;
  vinylSrc: string;
  audioSrc: string;
  color: string;
  accent: string;
}

export const records: readonly RecordDefinition[] = [
  {
    id: "record-01",
    title: "hey girl",
    artist: "boy pablo",
    sleeveText: "how are ya?",
    labelText: "whats up?",
    dim: 0,
    sleeveSrc: "art/sleeve-01.webp",
    vinylSrc: "art/vinyl-01.webp",
    audioSrc: "audio/record-01.mp3",
    color: "#88b8aa",
    accent: "#f4c98d",
  },
  {
    id: "record-02",
    title: "thank you i guess",
    artist: "Forrest Nolan",
    sleeveText: "thank\nyou",
    labelText: "thank you",
    dim: 0,
    sleeveSrc: "art/sleeve-02.webp",
    vinylSrc: "art/vinyl-02.webp",
    audioSrc: "audio/record-02.mp3",
    color: "#e98298",
    accent: "#f9e7b8",
  },
  {
    id: "record-03",
    title: "cozy",
    artist: "Tony22",
    sleeveText: "with you",
    labelText: "comfort",
    dim: 0,
    sleeveSrc: "art/sleeve-03.webp",
    vinylSrc: "art/vinyl-03.webp",
    audioSrc: "audio/record-03.mp3",
    color: "#9da7d7",
    accent: "#f4b4c4",
  },
  {
    id: "record-04",
    title: "An Art Gallery Could Never Be As Unique As You",
    artist: "mrld",
    sleeveText: "autumn\ncinnamon",
    labelText: "autumn\ncinnamon",
    dim: 0,
    sleeveSrc: "art/sleeve-04.webp",
    vinylSrc: "art/vinyl-04.webp",
    audioSrc: "audio/record-04.mp3",
    color: "#d89b65",
    accent: "#f7e3a4",
  },
  {
    id: "record-05",
    title: "Flamin Hot Cheetos",
    artist: "Clairo",
    sleeveText: "flamin chitatos",
    labelText: "chitato",
    dim: 0,
    sleeveSrc: "art/sleeve-05.webp",
    vinylSrc: "art/vinyl-05.webp",
    audioSrc: "audio/record-05.mp3",
    color: "#b68cc7",
    accent: "#bde1d4",
  },
  {
    id: "record-06",
    title: "Be My Mistake",
    artist: "The 1975",
    sleeveText: "Promises.\nRegrets.",
    labelText: "I won't regret.\n&\nPromise.",
    dim: 0,
    sleeveSrc: "art/sleeve-06.webp",
    vinylSrc: "art/vinyl-06.webp",
    audioSrc: "audio/record-06.mp3",
    color: "#75a5c7",
    accent: "#ffd0a8",
  },
  {
    id: "record-07",
    title: "Requiem.",
    artist: "Unknown Artist",
    sleeveText: "you.",
    labelText: "remedy",
    giftMessage: "i promise the last piece is good yayaya",
    dim: 1,
    // Times and fades are seconds and can be edited directly.
    dimTimeline: [{ start: 71, end: 267, fadeIn: 3, fadeOut: 1 }],
    sleeveSrc: "art/sleeve-07.webp",
    vinylSrc: "art/vinyl-07.webp",
    audioSrc: "audio/record-07.mp3",
    color: "#c77f75",
    accent: "#efd4cb",
  },
  {
    id: "record-08",
    title: "of everyone in the world...",
    artist: "love interest",
    sleeveText: "Remedy.",
    labelText: "its you.",
    giftMessage: "hi gweng gweng,\ni hope u enjoyed listening to this playlist as much as i enjoyed making it ♡",
    dim: 1,
    // Times and fades are seconds and can be edited directly.
    dimTimeline: [{ start: 33, end: 39, fadeIn: 4, fadeOut: 0.5 }, { start: 96, end: 102, fadeIn: 4, fadeOut: 0.5 }],
    lyrics: [
      {
        start: 33,
        end: 39,
        x: 32,
        y: 23,
        rotation: -4,
        words: [
          { text: "no", at: 33 },
          { text: "you", at: 33.2 },
          { text: "didn't", at: 33.9 },
          { text: "ask", at: 35.4 },
          { text: "but..", at: 36.2 },
          { text: "i", at: 37.1 },
		  { text: "think", at: 38 },
        ],
      },
      {
        start: 39,
        end: 43.2,
        x: 34,
        y: 21,
        rotation: -2,
        words: [
          { text: "that", at: 39 },
          { text: "Of", at: 40.05 },
          { text: "everyone", at: 41 },
          { text: "in", at: 41.9 },
          { text: "the", at: 42.1 },
          { text: "world", at: 42.25 },
        ],
      },
      {
        start: 43.2,
        end: 45.7,
        x: 68,
        y: 28,
        rotation: 2.5,
        words: [
          { text: "'Cause", at: 43.2 },
          { text: "you're", at: 43.4 },
          { text: "the", at: 43.5 },
          { text: "one", at: 43.6 },
          { text: "that's     ", at: 44.8 },
          { text: "my", at: 44.9 },
          { text: "girl", at: 45 },
        ],
      },
      {
        start: 46,
        end: 54.5,
        x: 48,
        y: 18,
        rotation: -1.5,
        scale: .92,
        words: [
          { text: "I", at: 46 },
          { text: "need", at: 46.3 },
          { text: "you", at: 46.5 },
          { text: "in", at: 47 },
          { text: "my", at: 47.1 },
          { text: "li", at: 48 },
          { text: "-i", at: 48.9, join: true },
          { text: "-i", at: 49.65, join: true },
          { text: "-i", at: 50.3, join: true },
          { text: "-i", at: 50.86, join: true },
          { text: "-i", at: 51.35, join: true },
          { text: "-i", at: 51.78, join: true },
          { text: "-i", at: 52.16, join: true },
          { text: "-i", at: 52.5, join: true },
          { text: "-i", at: 52.8, join: true },
          { text: "-i", at: 53.07, join: true },
          { text: "-i", at: 53.31, join: true },
          { text: "-i", at: 53.52, join: true },
          { text: "-ife,", at: 53.8, join: true },
          { text: "woo", at: 53.8 },
        ],
      },
      {
        start: 53.9,
        end: 57,
        x: 30,
        y: 29,
        rotation: -3,
        words: [
          { text: "Of", at: 53.9 },
          { text: "everyone,", at: 55.2 },
          { text: "you", at: 56.1 },
          { text: "annoy", at: 56.45 },
        ],
      },
      {
        start: 57,
        end: 60,
        x: 69,
        y: 20,
        rotation: 3,
        words: [
          { text: "You're", at: 57 },
          { text: "the", at: 57.1 },
          { text: "one,", at: 57.2 },
          { text: "that's", at: 58.4 },
          { text: "my", at: 58.5 },
          { text: "boy", at: 58.6 },
        ],
      },
      {
        start: 60,
        end: 69,
        x: 48,
        y: 27,
        rotation: 1,
        scale: .92,
        words: [
          { text: "I", at: 60 },
          { text: "need", at: 60.3 },
          { text: "you", at: 60.5 },
          { text: "in", at: 61 },
          { text: "my", at: 61.1 },
          { text: "li", at: 62 },
          { text: "-i", at: 62.9, join: true },
          { text: "-i", at: 63.65, join: true },
          { text: "-i", at: 64.3, join: true },
          { text: "-i", at: 64.86, join: true },
          { text: "-i", at: 65.35, join: true },
          { text: "-i", at: 65.78, join: true },
          { text: "-i", at: 66.16, join: true },
          { text: "-i", at: 66.5, join: true },
          { text: "-i", at: 66.8, join: true },
          { text: "-i", at: 67.07, join: true },
          { text: "-i", at: 67.31, join: true },
          { text: "-i", at: 67.52, join: true },
          { text: "-i", at: 67.71, join: true },
          { text: "-ife,", at: 67.9, join: true },
          { text: "woo", at: 68.1 },
        ],
      },
      {
        start: 96,
        end: 102,
        x: 65,
        y: 24,
        rotation: 3,
        scale: 1.08,
        words: [
          { text: "no", at: 96 },
          { text: "you", at: 96.2 },
          { text: "didn't", at: 96.9 },
          { text: "ask", at: 98.4 },
          { text: "but..", at: 99.2 },
          { text: "i", at: 100.1 },
          { text: "think", at: 101 },
        ],
      },
      {
        start: 102,
        end: 106,
        x: 66,
        y: 27,
        rotation: 2,
        words: [
          { text: "that", at: 102.2 },
          { text: "Of", at: 103 },
          { text: "everyone", at: 103.95 },
          { text: "in", at: 104.85 },
          { text: "the", at: 105.05 },
          { text: "world", at: 105.2 },
        ],
      },
      {
        start: 106,
        end: 108.9,
        x: 32,
        y: 28,
        rotation: -2.5,
        words: [
          { text: "'Cause", at: 106.3 },
          { text: "you're", at: 106.4 },
          { text: "the", at: 106.5 },
          { text: "one", at: 106.6 },
          { text: "that's     ", at: 107.7 },
          { text: "my", at: 107.8 },
          { text: "girl", at: 107.9 },
        ],
      },
      {
        start: 109,
        end: 117.2,
        x: 50,
        y: 18,
        rotation: 1,
        scale: .92,
        words: [
          { text: "I", at: 109 },
          { text: "need", at: 109.2 },
          { text: "you", at: 109.4 },
          { text: "in", at: 109.9 },
          { text: "my", at: 110 },
          { text: "li", at: 110.5 },
          { text: "-i", at: 110.9, join: true },
          { text: "-i", at: 111.65, join: true },
          { text: "-i", at: 112.3, join: true },
          { text: "-i", at: 112.86, join: true },
          { text: "-i", at: 113.35, join: true },
          { text: "-i", at: 113.78, join: true },
          { text: "-i", at: 114.16, join: true },
          { text: "-i", at: 114.5, join: true },
          { text: "-i", at: 114.8, join: true },
          { text: "-i", at: 115.07, join: true },
          { text: "-i", at: 115.31, join: true },
          { text: "-i", at: 115.52, join: true },
          { text: "-i", at: 115.71, join: true },
          { text: "-i", at: 115.88, join: true },
          { text: "-i", at: 116.04, join: true },
          { text: "-i", at: 116.19, join: true },
          { text: "-i", at: 116.33, join: true },
          { text: "-i", at: 116.46, join: true },
          { text: "-i", at: 116.58, join: true },
          { text: "-i", at: 116.69, join: true },
          { text: "-ife,", at: 116.8, join: true },
          { text: "woo", at: 117 },
        ],
      },
      {
        start: 117.1,
        end: 120,
        x: 69,
        y: 29,
        rotation: 3,
        words: [
          { text: "Of", at: 117.1 },
          { text: "everyone,", at: 117.6 },
          { text: "you", at: 118.9 },
          { text: "annoy", at: 119.3 },
        ],
      },
      {
        start: 120,
        end: 123,
        x: 31,
        y: 21,
        rotation: -3,
        words: [
          { text: "You're", at: 120.3 },
          { text: "the", at: 120.5 },
          { text: "one,", at: 120.8 },
          { text: "that's", at: 121.6 },
          { text: "my", at: 121.8 },
          { text: "boy", at: 121.9 },
        ],
      },
      {
        start: 123,
        end: 132,
        x: 50,
        y: 27,
        rotation: 1,
        scale: .92,
        words: [
          { text: "I", at: 123 },
          { text: "need", at: 123.3 },
          { text: "you", at: 123.5 },
          { text: "in", at: 124 },
          { text: "my", at: 124.1 },
          { text: "li", at: 125 },
          { text: "-i", at: 125.9, join: true },
          { text: "-i", at: 126.65, join: true },
          { text: "-i", at: 127.3, join: true },
          { text: "-i", at: 127.86, join: true },
          { text: "-i", at: 128.35, join: true },
          { text: "-i", at: 128.78, join: true },
          { text: "-i", at: 129.16, join: true },
          { text: "-i", at: 129.5, join: true },
          { text: "-i", at: 129.8, join: true },
          { text: "-i", at: 130.07, join: true },
          { text: "-i", at: 130.31, join: true },
          { text: "-i", at: 130.52, join: true },
          { text: "-i", at: 130.71, join: true },
          { text: "-ife,", at: 130.9, join: true },
          { text: "woo", at: 131.1 },
        ],
      },
    ],
    sleeveSrc: "art/sleeve-08.webp",
    vinylSrc: "art/vinyl-08.webp",
    audioSrc: "audio/record-08.mp3",
    color: "#7fa4c7",
    accent: "#cbe6ef",
  },
] as const;

