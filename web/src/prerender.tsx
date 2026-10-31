import type { ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import Hub from './Hub'

// 빌드 때 kit/scripts/prerender.mjs 가 불러 씀. 브라우저 번들에는 안 들어감
const pages = import.meta.glob<{ default: ComponentType }>('../*/Page.tsx', { eager: true })

/** dist/site 기준 HTML 경로 → 미리 그린 본문 */
export function render(): Record<string, string> {
  const out: Record<string, string> = { 'index.html': renderToString(<Hub />) }
  for (const [file, mod] of Object.entries(pages)) {
    const dir = file.split('/')[1] // '../<id>/Page.tsx' → '<id>'
    const Page = mod.default
    out[`${dir}/index.html`] = renderToString(<Page />)
  }
  return out
}
