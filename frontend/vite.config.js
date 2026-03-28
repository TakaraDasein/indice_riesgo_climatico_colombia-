import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Sin proxy — todos los datos se sirven como estáticos desde /data/
})
