#!/usr/bin/env node
/*
 * React 페이지 사전 렌더링 (npm run build 에서 vite build 다음에 실행)
 * web/src/prerender.tsx 로 각 페이지를 HTML로 그려 dist/site/<page>/index.html 의 <div id="root"> 안에 넣는다.
 * JS가 오기 전에도 내용이 보이고(첫 화면이 비지 않음), 브라우저에서는 mount() 가 이 HTML에 hydrate 한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import { ROOT } from './lib.mjs'

const out = path.join(ROOT, 'dist', 'site')
const empty = '<div id="root"></div>'

// vite.config.ts 를 그대로 쓰는 개발 서버를 포트 없이 띄워 TSX를 불러옴
const vite = await createServer({
  configFile: path.join(ROOT, 'vite.config.ts'),
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})
try {
  const { render } = await vite.ssrLoadModule('/src/prerender.tsx')
  const pages = render()
  for (const [rel, html] of Object.entries(pages)) {
    const file = path.join(out, rel)
    const src = fs.readFileSync(file, 'utf8')
    if (!src.includes(empty)) throw new Error(`${rel}: ${empty} 를 찾지 못함`)
    fs.writeFileSync(file, src.replace(empty, `<div id="root">${html}</div>`))
  }
  console.log(`✓ React 페이지 ${Object.keys(pages).length}개 사전 렌더링`)
} finally {
  await vite.close()
}
