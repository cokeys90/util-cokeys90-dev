#!/usr/bin/env node
/*
 * 정적 페이지 자리표시자 채우기 (npm run build 에서 vite build 다음에 실행)
 * vite가 web/(React 페이지)를 빌드하고 site/ 를 그대로 dist/site/ 에 복사한 뒤,
 * 이 스크립트가 site/ 의 HTML·CSS를 {{SITE_TITLE}} 같은 자리표시자를 release.config.json 값으로 채워 덮어쓴다.
 * dist/site/ 가 Firebase Hosting 공개 폴더다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadConfig, listFiles, fill } from './lib.mjs'

const cfg = loadConfig()
const site = cfg.site || {}
const src = path.join(ROOT, 'site')
const out = path.join(ROOT, 'dist', 'site')

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

const base = {
  SITE_TITLE: esc(site.title || cfg.domain),
  DEVELOPER: esc(cfg.developer),
  CONTACT_EMAIL: esc(cfg.contactEmail),
  DOMAIN: esc(cfg.domain),
}

const leftovers = new Set()
for (const rel of listFiles(src)) {
  const from = path.join(src, rel)
  const to = path.join(out, rel)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  if (!/\.(html|css|txt|xml)$/i.test(rel)) {
    fs.copyFileSync(from, to)
    continue
  }
  const id = rel.includes('/') ? rel.split('/')[0] : ''
  const e = (cfg.extensions || {})[id] || {}
  const vars = {
    ...base,
    EXT_ID: id,
    EXT_NAME: esc(e.name || id),
    PRIVACY_UPDATED: esc(e.privacyUpdated || ''),
  }
  const text = fill(fs.readFileSync(from, 'utf8'), vars)
  ;(text.match(/\{\{[A-Z_]+\}\}/g) || []).forEach((m) => leftovers.add(`${rel}: ${m}`))
  fs.writeFileSync(to, text)
}

let warn = false
if (/example\.com/.test(cfg.contactEmail) || /이름 또는/.test(cfg.developer)) {
  console.log('⚠ release.config.json의 developer, contactEmail이 아직 예시 값입니다.')
  warn = true
}
leftovers.forEach((l) => {
  console.log('⚠ 채워지지 않은 자리표시자 ' + l)
  warn = true
})
console.log(`✓ dist/site/ 정적 페이지 채움 (${listFiles(out).length}개 파일)`)
if (process.argv.includes('--strict') && warn) process.exit(1)
