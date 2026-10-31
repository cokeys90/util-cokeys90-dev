#!/usr/bin/env node
/*
 * 스토어 제출용 zip 만들기
 *   node kit/scripts/pack.mjs <확장 폴더 이름> [--bump patch|minor|major]
 * 하는 일: 버전 올리기(선택) → 홈페이지 주소 채우기 → 제출 전 점검 → dist/<이름>-<버전>.zip 생성
 * zip 안에는 폴더 없이 manifest.json이 맨 위에 오도록 담는다 (스토어 요구 사항).
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, readJSON, writeJSON, loadConfig, listFiles, makeZip } from './lib.mjs'

const args = process.argv.slice(2)
const id = args.find((a) => !a.startsWith('--'))
const bump = args.includes('--bump') ? args[args.indexOf('--bump') + 1] : null
if (!id) {
  console.error('사용법: node kit/scripts/pack.mjs <확장 폴더 이름> [--bump patch|minor|major]')
  process.exit(1)
}
const dir = path.join(ROOT, 'extensions', id)
const manifestPath = path.join(dir, 'manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error(`extensions/${id}/manifest.json 이 없습니다.`)
  process.exit(1)
}
const cfg = loadConfig()
const m = readJSON(manifestPath)

// 1. 버전 올리기
if (bump) {
  const parts = m.version.split('.').map(Number)
  while (parts.length < 3) parts.push(0)
  if (bump === 'major') parts.splice(0, 3, parts[0] + 1, 0, 0)
  else if (bump === 'minor') parts.splice(1, 2, parts[1] + 1, 0)
  else if (bump === 'patch') parts[2] += 1
  else {
    console.error('--bump 값은 patch, minor, major 중 하나입니다.')
    process.exit(1)
  }
  m.version = parts.join('.')
}

// 2. 홈페이지 주소 채우기
if (cfg.domain && cfg.domain !== 'example.com') m.homepage_url = `https://${cfg.domain}/${id}/`
writeJSON(manifestPath, m)

// 3. 제출 전 점검
const problems = []
const warns = []
if (m.manifest_version !== 3) problems.push('manifest_version이 3이 아닙니다.')
if (!m.name) problems.push('name이 없습니다.')
if (!m.description) problems.push('description(스토어 요약)이 없습니다.')
else if ([...m.description].length > 132)
  problems.push(`description이 132자를 넘습니다 (${[...m.description].length}자).`)
if (!/^\d+(\.\d+){0,3}$/.test(m.version)) problems.push(`version 형식이 잘못됐습니다: ${m.version}`)
const icon128 = m.icons && m.icons['128']
if (!icon128 || !fs.existsSync(path.join(dir, icon128))) problems.push('128×128 아이콘이 없습니다.')
for (const p of Object.values(m.icons || {}))
  if (!fs.existsSync(path.join(dir, p))) problems.push(`아이콘 파일이 없습니다: ${p}`)
if (!m.homepage_url || m.homepage_url.includes('example.com'))
  warns.push('homepage_url이 아직 example.com입니다. release.config.json의 domain을 채워 주세요.')
const broad = (m.host_permissions || []).filter(
  (h) => h === '<all_urls>' || h.startsWith('*://*/') || h === 'https://*/*',
)
if (broad.length)
  warns.push(`넓은 호스트 권한이 있습니다: ${broad.join(', ')} — 심사가 길어질 수 있어요.`)
const slow = (m.permissions || []).filter((p) =>
  ['tabs', 'cookies', 'webRequest', 'downloads', 'history', 'debugger'].includes(p),
)
if (slow.length)
  warns.push(`심사를 길게 만드는 권한: ${slow.join(', ')} — 꼭 필요한지 확인해 주세요.`)

const files = listFiles(dir).filter((f) => !/^(README\.md|.*\.map)$/i.test(f))
for (const f of files) {
  if (!/\.(js|mjs|html)$/i.test(f)) continue
  const s = fs.readFileSync(path.join(dir, f), 'utf8')
  if (/<script[^>]+src=["']https?:/i.test(s))
    problems.push(`${f}: 외부 스크립트를 불러옵니다 (원격 코드 금지).`)
  if (/\beval\s*\(|new Function\s*\(/.test(s))
    problems.push(`${f}: eval 또는 new Function을 씁니다.`)
  if (/\.html$/i.test(f) && /<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(s))
    problems.push(`${f}: 인라인 스크립트가 있습니다 (MV3에서 실행 안 됨).`)
  if (/\.html$/i.test(f) && /\son[a-z]+=["']/i.test(s))
    problems.push(`${f}: onclick 같은 인라인 이벤트가 있습니다 (MV3에서 실행 안 됨).`)
}

warns.forEach((w) => console.log('⚠ ' + w))
if (problems.length) {
  problems.forEach((p) => console.error('✗ ' + p))
  console.error('\n문제를 고친 뒤 다시 실행해 주세요.')
  process.exit(1)
}

// 4. zip
const outDir = path.join(ROOT, 'dist')
fs.mkdirSync(outDir, { recursive: true })
const zipPath = path.join(outDir, `${id}-${m.version}.zip`)
const zip = makeZip(files.map((f) => ({ name: f, data: fs.readFileSync(path.join(dir, f)) })))
fs.writeFileSync(zipPath, zip)
console.log(`✓ ${m.name} ${m.version}`)
console.log(
  `✓ 파일 ${files.length}개 → ${path.relative(ROOT, zipPath)} (${Math.round(zip.length / 1024)}KB)`,
)
