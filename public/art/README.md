# Artwork contract

## Records and sleeves

Export:

- \`sleeve-01.webp\` through \`sleeve-07.webp\`: square sleeve artwork.
- \`vinyl-01.webp\` through \`vinyl-07.webp\`: transparent square images with the circular record centered.

WebP is recommended; PNG also works after changing the paths in \`src/records.ts\`.

## Player layers

The current player is complete CSS placeholder art so it remains usable before final exports arrive. When applying the final aligned artwork:

- Keep one common canvas size for the background/base, platter, pivot, tonearm, volume slit, and volume thumb exports.
- Static visible layers can be composited into the base for a smaller site.
- Keep the tonearm and volume thumb separate because they move.
- Record the platter center, tonearm pivot, tonearm rest/play angles, and volume path as percentages of the common canvas.
- Apply those measurements to the corresponding rules in \`src/style.css\`; the interaction logic does not need to change.
- Ensure transparent pixels do not receive pointer events; the app already uses separate HTML hit areas for the tonearm and slider.
