# Frontend assets

The packaged local app referenced these bundled frontend files:

- `index-B2f6S92m.js`
- `index-B2K8pjcE.css`

They are generated/minified bundle artifacts from `resources/app.asar`, not the original React source files. The original development `src/` directory was not available in the local app folder.

For future development, recover or recreate the original React source and rebuild these assets with Vite instead of editing the minified bundle directly.
