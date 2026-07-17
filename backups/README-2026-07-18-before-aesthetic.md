# Gwyn Record Player

A small static vinyl-player gift built with Vite and TypeScript. It works locally with CSS placeholder artwork; add the final art and songs using the paths below.

## Run it

\`\`\`powershell
npm install
npm run dev
\`\`\`

Run checks with \`npm test\` and \`npm run build\`.

## Add the seven songs

Place MP3 files in \`public/audio/\` using:

- \`record-01.mp3\`
- \`record-02.mp3\`
- \`record-03.mp3\`
- \`record-04.mp3\`
- \`record-05.mp3\`
- \`record-06.mp3\`
- \`record-07.mp3\`

Edit titles and artists in \`src/records.ts\`. MP3 at roughly 192 kbps is recommended. The app deliberately shows a friendly missing-file message until these files exist.

## Add the artwork

Put sleeve and vinyl exports in \`public/art/\` using \`sleeve-01.webp\` through \`sleeve-07.webp\` and \`vinyl-01.webp\` through \`vinyl-07.webp\`. Missing images automatically fall back to the built-in CSS art.

See \`public/art/README.md\` for player-layer guidance.

## GitHub Pages

1. Create a public GitHub repository named \`gwyn-record-player\`.
2. Push this project to its \`main\` branch.
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. The included workflow builds and deploys the site.
5. Open \`https://YOUR-USERNAME.github.io/gwyn-record-player/\`.

If the repository name changes, update \`base\` in \`vite.config.ts\`.
