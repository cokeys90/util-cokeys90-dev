import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// 페이지 진입점(main.tsx)에서만 부름. 컴포넌트 파일과 섞으면 Fast Refresh가 안 됨
export function mount(page: ReactNode) {
  createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>)
}
