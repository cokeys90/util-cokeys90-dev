import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import config from './release.config.json' with { type: 'json' }

const root = path.resolve(import.meta.dirname, 'web')

// web/index.html(허브)과 web/<id>/index.html(확장 소개)이 각각 한 페이지
const pages = Object.fromEntries(
  fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(root, e.name, 'index.html')))
    .map((e) => [e.name, path.join(root, e.name, 'index.html')]),
)

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// JS 없이도 보이는 <title>·description은 HTML에 직접 채움
const htmlVars: Record<string, string> = {
  SITE_TITLE: esc(config.site.title),
  SITE_DESCRIPTION: esc(`${config.site.headline} ${config.site.tagline}`),
}

export default defineConfig({
  root,
  // site/ 정적 파일(방침·도움말·404·이미지)을 그대로 복사. 자리표시자는 build-site.mjs가 이어서 채움
  publicDir: path.resolve(import.meta.dirname, 'site'),
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'site-config-html',
      transformIndexHtml: (html) =>
        html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
          if (!(k in htmlVars)) throw new Error(`web/ HTML에 모르는 자리표시자 ${m}`)
          return htmlVars[k]
        }),
    },
  ],
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist', 'site'),
    emptyOutDir: true,
    rolldownOptions: { input: { main: path.join(root, 'index.html'), ...pages } },
  },
})
