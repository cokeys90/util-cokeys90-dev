#!/usr/bin/env node
/*
 * 새 확장 프로그램 뼈대 만들기
 *   node kit/scripts/new-extension.mjs <폴더 이름> "<확장 이름>"
 * 만드는 것:
 *   extensions/<폴더>/   MV3 뼈대 (아이콘, 앱 화면, 데이터 지우기 버튼 포함)
 *   web/<폴더>/          소개 페이지 (React)
 *   site/<폴더>/         개인정보처리방침 · 도움말 페이지 (정적)
 *   store/<폴더>/        스토어 제출 문구, 스크린샷 폴더
 *   release.config.json  확장 항목 추가
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, readJSON, writeJSON, listFiles, fill } from './lib.mjs'

const [id, name] = process.argv.slice(2)
if (!id || !name || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
  console.error(
    '사용법: node kit/scripts/new-extension.mjs <폴더 이름(영문 소문자·숫자·-)> "<확장 이름>"',
  )
  process.exit(1)
}
const T = path.join(ROOT, 'kit', 'templates')
const targets = [
  ['extension', path.join(ROOT, 'extensions', id)],
  ['web', path.join(ROOT, 'web', id)],
  ['site', path.join(ROOT, 'site', id)],
  ['store', path.join(ROOT, 'store', id)],
]
for (const [, dest] of targets) {
  if (fs.existsSync(dest)) {
    console.error(`이미 있습니다: ${path.relative(ROOT, dest)}`)
    process.exit(1)
  }
}
// 확장 폴더는 이름을 바로 채우고, 사이트 페이지의 나머지 자리표시자는 build-site 때 채운다
for (const [kind, dest] of targets) {
  const src = path.join(T, kind)
  for (const rel of listFiles(src)) {
    const to = path.join(dest, rel)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    if (/\.(png|jpg|jpeg|gif|webp|ico)$/i.test(rel)) fs.copyFileSync(path.join(src, rel), to)
    else
      fs.writeFileSync(
        to,
        fill(fs.readFileSync(path.join(src, rel), 'utf8'), { EXT_NAME: name, EXT_ID: id }),
      )
  }
}
fs.mkdirSync(path.join(ROOT, 'store', id, 'screenshots'), { recursive: true })
fs.copyFileSync(
  path.join(T, 'extension', 'icons', 'icon128.png'),
  path.join(ROOT, 'site', id, 'icon.png'),
)

const cfgPath = path.join(ROOT, 'release.config.json')
const cfg = readJSON(cfgPath)
cfg.extensions = cfg.extensions || {}
cfg.extensions[id] = { name, storeUrl: '', privacyUpdated: new Date().toISOString().slice(0, 10) }
writeJSON(cfgPath, cfg)

console.log(`✓ extensions/${id}/, web/${id}/, site/${id}/, store/${id}/ 를 만들었습니다.`)
console.log(
  '다음 할 일: kit/CHECKLIST.md 를 위에서부터 따라가세요. 아이콘은 extensions/' +
    id +
    '/icons/ 를 바꾸면 됩니다.',
)
