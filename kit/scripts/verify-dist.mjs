#!/usr/bin/env node
/*
 * 배포 직전 빌드 결과물 점검 (npm run verify 의 마지막 단계)
 * dist/site/ 를 운영에 올려도 되는지 본다. 파일을 고치지 않는다. 문제가 있으면 종료 코드 1.
 * - 허브와 확장마다 소개·방침·도움말 페이지가 있는지
 * - 채워지지 않은 {{자리표시자}} 가 없는지
 * - CSP('self'만 허용)에 막히는 인라인 <script>, style="" 속성이 없는지
 * - HTML이 참조하는 같은 사이트 파일(/assets/... 등)이 실제로 있는지
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadConfig, listFiles } from './lib.mjs'

const out = path.join(ROOT, 'dist', 'site')
if (!fs.existsSync(out)) {
  console.error('✗ dist/site/ 가 없음. npm run build 먼저')
  process.exit(1)
}
const cfg = loadConfig()
const files = new Set(listFiles(out))
const problems = []

const required = ['index.html', '404.html']
for (const id of Object.keys(cfg.extensions || {}))
  required.push(`${id}/index.html`, `${id}/privacy.html`, `${id}/support.html`, `${id}/icon.png`)
for (const f of required) if (!files.has(f)) problems.push(`${f}: 없음`)

for (const rel of files) {
  if (!/\.(html|css)$/i.test(rel)) continue
  const s = fs.readFileSync(path.join(out, rel), 'utf8')
  const left = s.match(/\{\{[A-Z_]+\}\}/g)
  if (left) problems.push(`${rel}: 채워지지 않은 자리표시자 ${[...new Set(left)].join(' ')}`)
  if (!rel.endsWith('.html')) continue
  if (/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(s))
    problems.push(`${rel}: 인라인 <script> (CSP 차단)`)
  if (/\sstyle\s*=\s*["']/i.test(s)) problems.push(`${rel}: style="" 속성 (CSP 차단)`)
  for (const [, ref] of s.matchAll(/\b(?:src|href)=["'](\/[^"'#?]*)/g)) {
    const target = ref.endsWith('/') ? ref.slice(1) + 'index.html' : ref.slice(1)
    if (!files.has(target)) problems.push(`${rel}: 없는 파일을 참조 ${ref}`)
  }
}

if (problems.length) {
  problems.forEach((p) => console.error('✗ ' + p))
  process.exit(1)
}
console.log(`✓ dist/site/ 배포 점검 통과 (${files.size}개 파일, 필수 페이지 ${required.length}개)`)
