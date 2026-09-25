import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: This app is deployed to a user/org GitHub Pages site
// (https://<user>.github.io/), so assets are served from the root.
export default defineConfig({
  base: '/',
  plugins: [react()],
})
