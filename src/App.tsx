import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode, RefObject } from 'react'
import { useDrag, useGesture } from '@use-gesture/react'
import { ArrowDown, ArrowRight, Check, ChevronLeft, ChevronRight, ChevronUp, Flower2, Grid2X2, Heart, Leaf, Moon, MoveHorizontal, RotateCw, Sun, Volume2, VolumeX, X } from 'lucide-react'
import { flowers } from './data'
import FlowerIllustration from './FlowerIllustration'
import { createAmbience } from './ambient'

const MeadowScene = lazy(() => import('./MeadowScene'))
const meadowWords = [
  { title: '把自己，交给\n一整个春天。', night: '月光落下，\n花也温柔地醒着。', en: 'SOMEWHERE, SPRING NEVER ENDS.' },
  { title: '坠入一场，\n不落幕的浪漫。', night: '今晚的月色，\n也为你心动。', en: 'FALL INTO A FIELD OF LOVE.' },
  { title: '风会把温柔，\n带到你身边。', night: '借一片星光，\n安放你的心事。', en: 'LET THE WIND CARRY YOU.' },
  { title: '平凡的日子，\n也会闪闪发光。', night: '小小的花，\n守着满天的星。', en: 'MAGIC IN THE ORDINARY.' },
]
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

function FlowerDetails({ index, saved, close, save, replay }: { index: number; saved: boolean; close: () => void; save: () => void; replay: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const flower = flowers[index]
  useFocusTrap(ref, close)
  const drag = useDrag(({ last, movement: [, y] }) => { if (last && y > 55) close() }, { axis: 'y', filterTaps: true, threshold: 8 })
  return <div className="detail-layer" onClick={e => { if (e.currentTarget === e.target) close() }}>
    <div className="detail-sheet" ref={ref} role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="sheet-handle" {...drag()}><span /><small>下滑，回到花海</small></div>
      <button className="close-button" onClick={close} aria-label="收起花朵详情"><X size={19} /></button>
      <button className="bloom-replay" onClick={replay} aria-label="重播花朵盛开动画"><RotateCw size={12} />再看一次花开</button>
      <div className="detail-content">
        <div className="detail-kicker"><Leaf size={13} /> THE LANGUAGE OF FLOWERS <span>{String(index + 1).padStart(2, '0')} / 04</span></div>
        <div className="detail-heading"><div><h2 id="detail-title">{flower.name}<em>{flower.en}</em></h2><p>{flower.latin}</p></div><FlowerIllustration id={flower.id} /></div>
        <div className="detail-meaning"><span>{flower.tag}</span><p>{flower.meaning}</p></div>
        <blockquote>{flower.poem}<span>“</span></blockquote>
        <div className="detail-facts"><div><small>与花相遇的季节</small><p>{flower.season}</p></div><div><small>送给此刻的你</small><p>{flower.note}</p></div></div>
        <button className={`save-button ${saved ? 'saved' : ''}`} onClick={save} aria-pressed={saved}><Heart size={17} fill={saved ? 'currentColor' : 'none'} />{saved ? '已收藏这份浪漫' : '把这份浪漫，留在花园里'}<span>{saved ? '取消收藏' : '收藏花朵'}</span></button>
        <p className="detail-footnote">一朵花，一份心意。花语是我们喜爱的浪漫解读。</p>
      </div>
    </div>
  </div>
}

function Collection({ panel, favorites, close, select }: { panel: Exclude<Panel, null>; favorites: string[]; close: () => void; select: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, close)
  const list = flowers.map((f, index) => ({ ...f, index })).filter(f => panel !== 'garden' || favorites.includes(f.id))
  return <div className="panel-layer" onClick={e => { if (e.currentTarget === e.target) close() }}>
    <div className="collection-panel" ref={ref} role="dialog" aria-modal="true" aria-labelledby="collection-title">
      <button className="close-button" onClick={close} aria-label="关闭花园"><X size={19} /></button>
      <span className="panel-eyebrow">A WORLD MADE OF LITTLE BLOOMS</span>
      <h2 id="collection-title">{panel === 'garden' ? '你收藏的，一点浪漫。' : '下一站，想去哪里？'}</h2>
      <p>{panel === 'garden' ? '喜欢的花海，随时为你盛开。收藏保存在这台设备上。' : '四片花海，四种温柔。选一片，让心慢下来。'}</p>
      {list.length > 0 ? <div className="collection-list">{list.map(f => <button key={f.id} onClick={() => { select(f.index); close() }}>
        <FlowerIllustration id={f.id} /><span><strong>{f.name}花海</strong><small>{f.meaning}</small></span><ArrowRight size={18} />
      </button>)}</div> : <div className="empty-garden"><Heart size={34} strokeWidth={1} /><p>还没有收藏的花。</p><small>上滑打开花语，留下你喜欢的那一朵。</small><button onClick={close}>回到花海 <ArrowRight size={15} /></button></div>}
    </div>
  </div>
}

export default function App() {
  const [index, setIndex] = useState(0)
  const [night, setNight] = useState(false)
  const [detail, setDetail] = useState(false)
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
  const ambience = useRef<ReturnType<typeof createAmbience> | null>(null)
  const flower = flowers[index], words = meadowWords[index]
  const saved = favorites.includes(flower.id)
  const choose = useCallback((value: number) => { setIndex((value + flowers.length) % flowers.length); setDetail(false) }, [])
  const step = useCallback((direction: number) => { setIndex(current => (current + direction + flowers.length) % flowers.length); setDetail(false) }, [])
  const closePanel = useCallback(() => setPanel(null), [])
  const closeDetail = useCallback(() => setDetail(false), [])
  const onReady = useCallback(() => setReady(true), [])
  const onLost = useCallback(() => { setFailed(true); setReady(false) }, [])
  const changeTime = useCallback(() => setNight(current => !current), [])

  const navigateGesture = useCallback((x: number, y: number) => {
    if (panel || detail) return
    if (Math.abs(x) > Math.abs(y) * 1.2 && Math.abs(x) > 60) step(x < 0 ? 1 : -1)
    else if (Math.abs(y) > Math.abs(x) * 1.2 && Math.abs(y) > 65) {
      if (y < 0) setDetail(true)
      else changeTime()
    }
  }, [panel, detail, step, changeTime])
  useGesture({
    onDragEnd: ({ movement: [x, y], canceled }) => { if (!canceled) navigateGesture(x, y) },
    onWheel: ({ event }) => event.preventDefault(),
    onWheelEnd: ({ movement: [x, y] }) => navigateGesture(-x, -y),
    onMove: ({ xy: [x, y] }) => { pointer.current = { x: x / innerWidth * 2 - 1, y: y / innerHeight * 2 - 1 } },
    onHover: ({ hovering }) => { if (!hovering) pointer.current = { x: 0, y: 0 } },
  }, { target: stage, enabled: !panel && !detail, eventOptions: { passive: false }, drag: { filterTaps: true, threshold: 10 } })

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
  useEffect(() => { document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#1b283e' : '#eec6a1') }, [night])
  useEffect(() => () => ambience.current?.dispose(), [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2800)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (panel || detail || e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setDetail(true) }
      if (e.key === 'ArrowDown') { e.preventDefault(); changeTime() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [panel, detail, step, changeTime])
  function saveFlower() {
    const next = saved ? favorites.filter(id => id !== flower.id) : [...favorites, flower.id]
    setFavorites(next)
    try { localStorage.setItem('hanakotoba-garden', JSON.stringify(next)); setToast(saved ? '已移出收藏。' : '这片花海，已留在你的花园。') }
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
  const fallback = <div className="meadow-fallback"><FlowerIllustration id={flower.id} /><p>花海暂时无法打开</p><button onClick={retry}>重新尝试 <ArrowRight size={15} /></button></div>

  return <main className={`experience ${night ? 'night' : 'day'} ${detail ? 'show-details' : ''}`} data-mode={night ? 'night' : 'day'} data-flower={flower.id}>
    <div className="sky"><div className="sky-glow" /><div className="celestial-body" /><div className="stars">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: `${(i * 73.17) % 100}%`, top: `${(i * 17.33) % 47}%`, animationDelay: `${i * .17}s` }} />)}</div></div>
    <div className="meadow-stage" ref={stage} role="img" aria-label={`${night ? '月夜' : '日光'}中的${flower.name}三维花海。左右滑动切换，上滑查看花语，下滑切换昼夜。`}>
      {!ready && !failed && <div className="meadow-loader"><Flower2 size={28} strokeWidth={1} /><span>风来了，花也醒了。</span></div>}
      {failed ? fallback : <SceneBoundary key={sceneKey} onError={onLost} fallback={fallback}><Suspense fallback={null}>
        <MeadowScene flower={flower.id} night={night} motion={!reduced} active={visible && !panel}
          detail={detail} bloomReplay={bloomReplay} pointer={pointer} onReady={onReady} onLost={onLost} />
      </Suspense></SceneBoundary>}
    </div>
    <div className="atmosphere-overlay" />
    <header className="meadow-header">
      <button className="brand" onClick={() => { choose(0); setNight(false) }} aria-label="回到郁金香花海"><Flower2 size={26} strokeWidth={1.2} /><span><strong>花语小庭</strong><small>HANAKOTOBA</small></span></button>
      <span className="header-note"><span /> 一片只属于你的，温柔世界</span>
      <div className="header-actions">
        <button className="hud-button collection-button" onClick={() => setPanel('collection')} aria-label="选择花海"><Grid2X2 size={17} strokeWidth={1.3} /></button>
        <button className="hud-button" onClick={() => setPanel('garden')} aria-label="我的花园"><Heart size={17} strokeWidth={1.3} />{favorites.length > 0 && <i />}</button>
        <button className="hud-button" onClick={toggleSound} aria-label={sound ? '关闭环境声音' : '开启环境声音'} aria-pressed={sound}>{sound ? <Volume2 size={17} strokeWidth={1.3} /> : <VolumeX size={17} strokeWidth={1.3} />}</button>
      </div>
    </header>
    <div className="time-control"><button onClick={changeTime} className="time-toggle" aria-label={night ? '切换到白天' : '切换到夜晚'} aria-pressed={night}><span className={!night ? 'chosen' : ''}><Sun size={13} />日光</span><span className={night ? 'chosen' : ''}><Moon size={12} />月色</span></button><small><ArrowDown size={10} /> 下滑，{night ? '让春天醒来' : '让日光入梦'}</small></div>
    <div className="meadow-title" key={`${flower.id}-${night}`}>
      <span className="title-eyebrow">{night ? 'UNDER THE SAME TENDER MOON' : words.en}</span>
      <h1>{night ? words.night : words.title}</h1>
      <p>{night ? '白天的心事，就交给晚风吧。' : '不必去远方，浪漫就在这一刻。'}</p>
    </div>
    <div className="meadow-bottom">
      <div className="meadow-identity"><span className="field-number">{String(index + 1).padStart(2, '0')}<i />04</span><button onClick={() => setDetail(true)} aria-label={`查看${flower.name}花语`}><h2>{flower.name}<em>{flower.en} meadow</em></h2><p>{flower.meaning}<ArrowRight size={13} /></p></button></div>
      <button className="reveal-button" onClick={() => setDetail(true)}><span className="reveal-icon"><ChevronUp size={19} strokeWidth={1.2} /></span><span>上滑，听花说话<small>A LITTLE BLOOM, A LOT OF LOVE</small></span></button>
      <div className="meadow-navigation"><div className="field-dots">{flowers.map((f, i) => <button key={f.id} className={i === index ? 'selected' : ''} onClick={() => choose(i)} aria-label={`切换到${f.name}花海`} aria-pressed={i === index}><span /><small>{f.name}</small></button>)}</div><div className="arrow-navigation"><button onClick={() => step(-1)} aria-label="上一片花海"><ChevronLeft size={18} /></button><span><MoveHorizontal size={15} /> 左右轻滑，遇见下一片花海</span><button onClick={() => step(1)} aria-label="下一片花海"><ChevronRight size={18} /></button></div></div>
    </div>
    <span className="side-note">SLOW DOWN. YOU'RE RIGHT WHERE YOU NEED TO BE.</span>
    {detail && <FlowerDetails index={index} saved={saved} close={closeDetail} save={saveFlower} replay={() => setBloomReplay(value => value + 1)} />}
    {panel && <Collection panel={panel} favorites={favorites} close={closePanel} select={choose} />}
    <div className={`toast ${toast ? 'show' : ''}`} role="status"><Check size={15} />{toast}</div>
    <span className="sr-only" aria-live="polite">{flower.name}花海，{night ? '月夜' : '白天'}。{flower.meaning}。</span>
  </main>
}
