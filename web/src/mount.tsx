import { StrictMode, type ReactNode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles.css'

// 페이지 진입점(main.tsx)에서만 부름. 컴포넌트 파일과 섞으면 Fast Refresh가 안 됨
export function mount(page: ReactNode) {
  const el = document.getElementById('root')!
  const app = <StrictMode>{page}</StrictMode>
  // 빌드 결과는 사전 렌더링된 HTML이 있어 hydrate, 개발 서버는 비어 있어 새로 그림
  if (el.hasChildNodes()) hydrateRoot(el, app)
  else createRoot(el).render(app)
}
