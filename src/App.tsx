import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode, RefObject } from 'react'
import { useGesture } from '@use-gesture/react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Grid2X2, Heart, RotateCw, Volume2, VolumeX, X } from 'lucide-react'
import { flowers } from './data'
import PoetryOverlay from './PoetryOverlay'
import FlowerIllustration from './FlowerIllustration'
import { createAmbience } from './ambient'

const MeadowScene = lazy(() => import('./MeadowScene'))
type Panel = 'collection' | 'garden' | null

function loadFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('hanakotoba-garden') || '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && flowers.some(f => f.id === id)) : []
  } catch { return [] }
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onError() }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function useFocusTrap(ref: RefObject<HTMLDivElement | null>, close: () => void) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close() }
      if (e.key !== 'Tab') return
      const nodes = ref.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]')
      if (!nodes?.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus({ preventScroll: true }) }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus({ preventScroll: true }) }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus({ preventScroll: true }) }
  }, [close, ref])
}

function Collection({ panel, favorites, close, select }: { panel: Exclude<Panel, null>; favorites: string[]; close: () => void; select: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, close)
  const list = flowers.map((f, index) => ({ ...f, index })).filter(f => panel !== 'garden' || favorites.includes(f.id))
  return <div className="panel-layer" onClick={e => { if (e.currentTarget === e.target) close() }}>
    <div className="collection-panel" ref={ref} role="dialog" aria-modal="true" aria-labelledby="collection-title">
      <button className="close-button" onClick={close} aria-label="关闭花园"><X size={18} /></button>
      <span className="micro-label">A LITTLE COLLECTION</span>
      <h2 id="collection-title">{panel === 'garden' ? 'Things you love.' : 'Where shall we wander?'}</h2>
      <p>{panel === 'garden' ? '喜欢的花，随时为你盛开。收藏保存在这台设备上。' : '选一朵花，慢慢停留。'}</p>
      {list.length > 0 ? <div className="collection-list">{list.map(f => <button key={f.id} onClick={() => { select(f.index); close() }}>
        <FlowerIllustration id={f.id} /><span><strong>{f.en}</strong><small>{f.name} · {f.meaning}</small></span><ArrowRight size={16} />
      </button>)}</div> : <div className="empty-garden"><Heart size={30} strokeWidth={1} /><p>A little space for love.</p><small>点击花名旁的爱心，留下一朵喜欢的花。</small><button onClick={close}>Back to the flowers <ArrowRight size={14} /></button></div>}
    </div>
  </div>
}

export default function App() {
  const [index, setIndex] = useState(0)
  const [night, setNight] = useState(false)
  const [reading, setReading] = useState(false)
  const [bloomReplay, setBloomReplay] = useState(0)
  const [panel, setPanel] = useState<Panel>(null)
  const [sound, setSound] = useState(false)
  const [visible, setVisible] = useState(!document.hidden)
  const [reduced, setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [favorites, setFavorites] = useState(loadFavorites)
  const [toast, setToast] = useState('')
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sceneKey, setSceneKey] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const wheelIntent = useRef({ x: 0, y: 0 })
  const ambience = useRef<ReturnType<typeof createAmbience> | null>(null)
  const flower = flowers[index], saved = favorites.includes(flower.id)
  const choose = useCallback((value: number) => { if (!reading) setIndex((value + flowers.length) % flowers.length) }, [reading])
  const step = useCallback((direction: number) => { if (!reading) setIndex(current => (current + direction + flowers.length) % flowers.length) }, [reading])
  const closePanel = useCallback(() => setPanel(null), [])
  const onReady = useCallback(() => setReady(true), [])
  const onLost = useCallback(() => { setFailed(true); setReady(false) }, [])
  const changeTime = useCallback(() => { if (!reading) setNight(current => !current) }, [reading])

  const navigateGesture = useCallback((x: number, y: number) => {
    if (panel) return
    if (reading) {
      if (y > 65 && Math.abs(y) > Math.abs(x) * 1.2) setReading(false)
      return
    }
    if (Math.abs(x) > Math.abs(y) * 1.2 && Math.abs(x) > 60) step(x < 0 ? 1 : -1)
    else if (Math.abs(y) > Math.abs(x) * 1.2 && Math.abs(y) > 65) {
      if (y < 0) setReading(true)
      else changeTime()
    }
  }, [panel, reading, step, changeTime])
  useGesture({
    onDragEnd: ({ movement: [x, y], canceled }) => { if (!canceled) navigateGesture(x, y) },
    onWheel: ({ event, first, delta: [x, y] }) => {
      event.preventDefault()
      if (first) wheelIntent.current = { x: 0, y: 0 }
      const intent = wheelIntent.current
      if (x * intent.x < 0) intent.x = 0
      if (y * intent.y < 0) intent.y = 0
      intent.x += x
      intent.y += y
    },
    onWheelEnd: () => navigateGesture(-wheelIntent.current.x, -wheelIntent.current.y),
    onMove: ({ xy: [x, y] }) => { pointer.current = { x: x / innerWidth * 2 - 1, y: y / innerHeight * 2 - 1 } },
    onHover: ({ hovering }) => { if (!hovering) pointer.current = { x: 0, y: 0 } },
  }, { target: stage, enabled: !panel, eventOptions: { passive: false }, drag: { filterTaps: true, threshold: 10 } })

  useEffect(() => {
    const visibility = () => setVisible(!document.hidden), query = matchMedia('(prefers-reduced-motion: reduce)')
    const preference = () => setReduced(query.matches)
    document.addEventListener('visibilitychange', visibility)
    query.addEventListener('change', preference)
    return () => { document.removeEventListener('visibilitychange', visibility); query.removeEventListener('change', preference) }
  }, [])
  useEffect(() => {
    if (sound && visible && !panel) void ambience.current?.resume()
    else void ambience.current?.pause()
  }, [sound, visible, panel])
  useEffect(() => { document.querySelector('meta[name="theme-color"]')?.setAttribute('content', reading ? '#101713' : night ? '#1b283e' : '#eec6a1') }, [night, reading])
  useEffect(() => () => ambience.current?.dispose(), [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (panel || e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (reading) {
        if (e.key.startsWith('Arrow')) e.preventDefault()
        if (e.key === 'ArrowDown' || e.key === 'Escape') setReading(false)
        return
      }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setReading(true) }
      if (e.key === 'ArrowDown') { e.preventDefault(); changeTime() }
      if (e.key === 'Escape') setReading(false)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [panel, reading, step, changeTime])
  function saveFlower() {
    const next = saved ? favorites.filter(id => id !== flower.id) : [...favorites, flower.id]
    setFavorites(next)
    try { localStorage.setItem('hanakotoba-garden', JSON.stringify(next)); setToast(saved ? '已移出收藏。' : 'A little moment, kept.') }
    catch { setToast('已收藏到本次会话，浏览器暂时无法保存。') }
  }
  async function toggleSound() {
    try {
      if (!ambience.current) ambience.current = createAmbience()
      if (sound) await ambience.current.pause()
      else await ambience.current.resume()
      setSound(!sound)
    } catch { setToast('暂时无法播放声音，请稍后再试。') }
  }
  const retry = () => { setFailed(false); setReady(false); setSceneKey(value => value + 1) }
  const fallback = <div className="meadow-fallback"><FlowerIllustration id={flower.id} /><p>The flowers will be back.</p><button onClick={retry}>Try again <ArrowRight size={14} /></button></div>

  return <main className={`experience ${night ? 'night' : 'day'} ${reading ? 'is-reading' : ''}`} data-mode={night ? 'night' : 'day'} data-flower={flower.id} data-view={reading ? 'text' : 'home'}>
    <div className="sky"><div className="sky-glow" /><div className="celestial-body" /><div className="stars">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: `${(i * 73.17) % 100}%`, top: `${(i * 17.33) % 47}%`, animationDelay: `${i * .17}s` }} />)}</div><div className="reading-sky" /></div>
    <div className="meadow-stage" ref={stage} role="img" aria-label={reading ? `${flower.name}花朵与英文描述动画。下滑返回主页。` : `${flower.name}花海。上滑展示英文描述，左右切换花朵，下滑切换昼夜。`}>
      {!ready && !failed && <div className="meadow-loader"><span className="loading-stem" /><span>A little moment.</span></div>}
      {failed ? fallback : <SceneBoundary key={sceneKey} onError={onLost} fallback={fallback}><Suspense fallback={null}>
        <MeadowScene flower={flower.id} night={night} motion={!reduced} active={visible && !panel}
          reading={reading} bloomReplay={bloomReplay} pointer={pointer} onReady={onReady} onLost={onLost} />
      </Suspense></SceneBoundary>}
    </div>
    <div className="atmosphere-overlay" />
    <header className="editorial-header">
      {reading ? <span className="edition-number">NO. {String(index + 1).padStart(3, '0')}</span> : <button className="edition-number" onClick={() => setPanel('collection')} aria-label="选择花朵">NO. {String(index + 1).padStart(3, '0')}</button>}
      <button className="wordmark" onClick={() => setReading(false)} aria-label="回到花海">HANAKOTOBA<span>A LITTLE WORLD OF FLOWERS</span></button>
      <div className="header-actions">
        {!reading && <><button className="quiet-icon collection-trigger" onClick={() => setPanel('collection')} aria-label="选择花海"><Grid2X2 size={15} strokeWidth={1.2} /></button>
        <button className="quiet-icon" onClick={() => setPanel('garden')} aria-label="我的花园"><Heart size={15} strokeWidth={1.2} />{favorites.length > 0 && <i />}</button></>}
        <button className="quiet-icon" onClick={toggleSound} aria-label={sound ? '关闭环境声音' : '开启环境声音'} aria-pressed={sound}>{sound ? <Volume2 size={15} strokeWidth={1.2} /> : <VolumeX size={15} strokeWidth={1.2} />}</button>
      </div>
    </header>
    <PoetryOverlay reading={reading} flowerIndex={index} night={night} reduced={reduced} />
    <div className="frame-line left-frame" /><div className="frame-line right-frame" />
    <footer className="editorial-footer">
      <div className="specimen-label"><span className="micro-label">{reading ? 'BOTANICAL NOTES' : 'FIELD NOTES'}</span><div><strong>{flower.en}</strong><button className={`favorite-mark ${saved ? 'saved' : ''}`} onClick={saveFlower} aria-label={saved ? `取消收藏${flower.name}` : `收藏${flower.name}`} aria-pressed={saved}><Heart size={14} strokeWidth={1.1} fill={saved ? 'currentColor' : 'none'} /></button></div><em>{flower.latin}</em></div>
      <div className="footer-center">
        {reading ? <button className="text-control bloom-control" onClick={() => setBloomReplay(value => value + 1)} aria-label="重播花朵盛开动画"><RotateCw size={12} strokeWidth={1.2} />Bloom again</button> : <span className="slow-note">NO HURRY. JUST HERE.</span>}
        {reading ? <button className="text-control home-control" onClick={() => setReading(false)} aria-label="返回主页">Back to the meadow<ArrowDown size={12} strokeWidth={1.2} /></button> : <button className="text-control view-control" onClick={() => setReading(true)} aria-label="展示英文描述">A closer look<ArrowUp size={12} strokeWidth={1.2} /></button>}
      </div>
      {!reading ? <div className="footer-right">
        <div className="mood-control"><button className={!night ? 'selected' : ''} onClick={() => setNight(false)} aria-label="切换到白天">DAY</button><span>/</span><button className={night ? 'selected' : ''} onClick={() => setNight(true)} aria-label="切换到夜晚">NIGHT</button></div>
        <div className="flower-navigation"><button onClick={() => step(-1)} aria-label="上一朵花"><ArrowLeft size={14} strokeWidth={1.1} /></button><span>{String(index + 1).padStart(2, '0')} — 04</span><button onClick={() => step(1)} aria-label="下一朵花"><ArrowRight size={14} strokeWidth={1.1} /></button></div>
      </div> : <span className="specimen-ending micro-label">JUST THIS MOMENT.</span>}
    </footer>
    {panel && <Collection panel={panel} favorites={favorites} close={closePanel} select={choose} />}
    <div className={`toast ${toast ? 'show' : ''}`} role="status"><Check size={13} />{toast}</div>
    <span className="sr-only" aria-live="polite">{flower.name}，{night ? '月夜' : '日光'}。{reading ? '英文描述，下滑返回主页。' : '主页花海。'}</span>
  </main>
}
