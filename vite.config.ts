import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This repo is a GitHub **project** Pages site, served from
// https://<user>.github.io/space-invaders/ — not the domain root.
// Assets therefore have to be referenced with a `/space-invaders/` prefix,
// otherwise the deployed index.html asks for /assets/... and gets a 404,
// leaving a blank page.
//
// If the repository is ever renamed, update this to match the new name
// (or use `base: './'`, which works at any path).
export default defineConfig({
  base: '/space-invaders/',
  plugins: [react()],
})
