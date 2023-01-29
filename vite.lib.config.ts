import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'
import {resolve} from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    dts()
  ],
  build: {
    target: 'modules',
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src', 'extractor.cheerio.ts'),
      name: 'unionpediaExtractor',
      formats: ['es', 'cjs'],
      fileName: format => `unionpedia-extractor.${format}.js`
    },
    minify: false,
    ssr: false,
    rollupOptions: {
      external: ['cheerio', 'follow-redirects', 'lru-cache']
    }
  }
})
