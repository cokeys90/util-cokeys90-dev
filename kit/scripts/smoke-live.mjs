#!/usr/bin/env node
/*
 * 배포 직후 운영 사이트 확인 (live 워크플로 마지막 단계)
 *   node kit/scripts/smoke-live.mjs [기준 주소]   기본값 https://<release.config.json domain>
 * - 허브와 확장마다 소개·방침·도움말 페이지가 200으로 열리는지
 * - 운영 허브 HTML이 방금 빌드한 JS(dist/site/index.html 의 해시 파일)를 가리키는지 = 배포가 반영됐는지
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadConfig } from './lib.mjs'

const cfg = loadConfig()
const base = (process.argv[2] || `https://${cfg.domain}`).replace(/\/$/, '')
const pages = ['/']
for (const id of Object.keys(cfg.extensions || {}))
  pages.push(`/${id}/`, `/${id}/privacy.html`, `/${id}/support.html`)

async function get(url) {
  // CDN 반영이 몇 초 늦을 수 있어 3번까지 다시 시도
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) return await res.text()
      if (i >= 3) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      if (i >= 3) throw e
    }
    await new Promise((r) => setTimeout(r, 5000))
  }
}

const problems = []
const html = {}
for (const p of pages) {
  try {
    html[p] = await get(base + p)
  } catch (e) {
    problems.push(`${p}: ${e.message}`)
  }
}

const built = path.join(ROOT, 'dist', 'site', 'index.html')
const entry = fs.existsSync(built)
  ? fs.readFileSync(built, 'utf8').match(/\/assets\/[^"']+\.js/)?.[0]
  : null
if (!entry) problems.push('dist/site/index.html 에서 빌드 JS를 못 찾음. npm run build 후 실행')
else if (html['/'] && !html['/'].includes(entry))
  problems.push(
    `/: 운영 HTML이 이번 빌드(${entry})를 가리키지 않음. 배포가 반영되지 않았을 수 있음`,
  )

if (problems.length) {
  problems.forEach((p) => console.error('✗ ' + p))
  process.exit(1)
}
console.log(`✓ ${base} 페이지 ${pages.length}개 정상, 이번 빌드 반영 확인 (${entry})`)
