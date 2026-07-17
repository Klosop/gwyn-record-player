# Roadmap

The record player already feels complete. These are optional polish ideas rather than requirements.

## Audio atmosphere

- [x] Add a brief, subtle needle-drop crackle before each song starts.
- [x] Add gentle vinyl wobble and visible label rotation during playback.

## Interactions

- [x] Let the user double-click a sleeve to automatically return the current record, remove the selected vinyl from its sleeve, and place it on the platter.
- [ ] Add keyboard controls:
  - `Space` moves the tonearm between its resting and playing positions.
  - `Arrow Up` and `Arrow Down` adjust the volume.
  - `Escape` returns the loaded vinyl to its sleeve.

## Player information

- [x] Add a small elapsed-time indicator styled like a handwritten note.
- [ ] Remember the volume and last selected record with `localStorage`.

## Gift detail

- [x] Add a hidden personal message beneath the seventh sleeve or reveal it after every record has been played.

## Accessibility

- [ ] Respect reduced-motion preferences with calmer or instant alternatives for record, sleeve, tonearm, spotlight, and hover animations.
