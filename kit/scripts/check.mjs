#!/usr/bin/env node
/*
 * CI와 커밋 전에 쓰는 점검 (npm run check)
 * - 모든 JS 파일 문법 검사
 * - 확장 프로그램 manifest 기본 규칙 (MV3, 설명 132자, 아이콘, 원격 코드·인라인 스크립트 없음)
 * 파일을 고치지 않는다. 문제가 있으면 종료 코드 1.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { ROOT, readJSON, listFiles } from './lib.mjs'

const problems = []

// 1. 문법 검사
const jsFiles = [
  ...listFiles(path.join(ROOT, 'kit')).map((f) => path.join('kit', f)),
  ...listFiles(path.join(ROOT, 'extensions')).map((f) => path.join('extensions', f)),
].filter((f) => /\.(js|mjs)$/.test(f))
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' })
  } catch (e) {
    problems.push(`${f}: 문법 오류\n${String(e.stderr || e.message).trim()}`)
  }
}

// 2. 확장 프로그램 manifest
const extRoot = path.join(ROOT, 'extensions')
for (const id of fs.readdirSync(extRoot)) {
  const dir = path.join(extRoot, id)
  const mp = path.join(dir, 'manifest.json')
  if (!fs.existsSync(mp)) continue
  let m
  try {
    m = readJSON(mp)
  } catch (e) {
    problems.push(`extensions/${id}/manifest.json: JSON 오류`)
    continue
  }
  if (m.manifest_version !== 3) problems.push(`${id}: manifest_version이 3이 아님`)
  if (!m.description || [...m.description].length > 132)
    problems.push(`${id}: description이 없거나 132자를 넘음`)
  for (const p of Object.values(m.icons || {}))
    if (!fs.existsSync(path.join(dir, p))) problems.push(`${id}: 아이콘 없음 ${p}`)
  for (const f of listFiles(dir)) {
    if (!/\.(js|html)$/i.test(f)) continue
    const s = fs.readFileSync(path.join(dir, f), 'utf8')
    if (/<script[^>]+src=["']https?:/i.test(s))
      problems.push(`${id}/${f}: 외부 스크립트 (원격 코드 금지)`)
    if (/\beval\s*\(|new Function\s*\(/.test(s)) problems.push(`${id}/${f}: eval 또는 new Function`)
    if (/\.html$/i.test(f) && /<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(s))
      problems.push(`${id}/${f}: 인라인 스크립트`)
  }
}

if (problems.length) {
  problems.forEach((p) => console.error('✗ ' + p))
  process.exit(1)
}
console.log(`✓ JS ${jsFiles.length}개 문법 정상, 확장 프로그램 manifest 정상`)
