#!/usr/bin/env node
/*
 * util.cokeys90.dev 사이트 만들기
 *   node kit/scripts/build-site.mjs   (npm run build)
 * site/ 를 dist/site/ 로 복사하면서 {{SITE_TITLE}} 같은 자리표시자를 release.config.json 값으로 채운다.
 * 첫 화면의 웹 도구·확장 프로그램 카드도 설정에서 만든다. dist/site/ 가 Firebase Hosting 공개 폴더다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadConfig, listFiles, fill } from './lib.mjs'

const cfg = loadConfig()
const site = cfg.site || {}
const src = path.join(ROOT, 'site')
const out = path.join(ROOT, 'dist', 'site')
fs.rmSync(out, { recursive: true, force: true })

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

const toolCards = Object.entries(cfg.tools || {})
  .map(
    ([id, t]) => `      <a class="item" href="${esc(t.url || `/${id}/`)}">
        <span class="ico mono" aria-hidden="true">${esc((t.name || id).trim()[0])}</span>
        <span class="body"><h3>${esc(t.name || id)}</h3><p>${esc(t.summary || '')}</p>
          <span class="tags"><span class="tag live">운영 중</span>${t.tag ? `<span class="tag">${esc(t.tag)}</span>` : ''}</span></span>
      </a>`,
  )
  .join('\n')

const extCards = Object.entries(cfg.extensions || {})
  .map(([id, e]) => {
    const hasIcon = fs.existsSync(path.join(src, id, 'icon.png'))
    return `      <a class="item" href="/${id}/">
        ${hasIcon ? `<img src="/${id}/icon.png" alt="">` : `<span class="ico mono" aria-hidden="true">${esc((e.name || id).trim()[0])}</span>`}
        <span class="body"><h3>${esc(e.name || id)}</h3><p>${esc(e.summary || '')}</p>
          <span class="tags">${e.storeUrl ? '<span class="tag live">Chrome 웹 스토어</span>' : '<span class="tag">스토어 등록 준비 중</span>'}<span class="tag">개인정보처리방침</span></span></span>
      </a>`
  })
  .join('\n')

const base = {
  SITE_TITLE: esc(site.title || cfg.domain),
  SITE_TAGLINE: esc(site.tagline || ''),
  REPO_URL: esc(site.repo || ''),
  DEVELOPER: esc(cfg.developer),
  CONTACT_EMAIL: esc(cfg.contactEmail),
  DOMAIN: esc(cfg.domain),
  TOOL_CARDS: toolCards || '      <p class="meta">아직 없어요.</p>',
  EXTENSION_CARDS: extCards || '      <p class="meta">아직 없어요.</p>',
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
    STORE_URL: e.storeUrl ? esc(e.storeUrl) : '#',
    STORE_DISABLED: e.storeUrl ? '' : 'aria-disabled="true" title="스토어 등록 후 열립니다"',
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
console.log(`✓ dist/site/ 생성 (${listFiles(out).length}개 파일)`)
if (process.argv.includes('--strict') && warn) process.exit(1)
