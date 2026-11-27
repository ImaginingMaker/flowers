import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Flower2, Heart, Leaf, Maximize2, MoveHorizontal, RotateCw, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { flowers } from './data'
import FlowerIllustration from './FlowerIllustration'
import { createAmbience } from './ambient'

const FlowerScene = lazy(() => import('./FlowerScene'))
type Panel = 'collection' | 'garden' | 'story' | null

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

function Dialog({ panel, close, favorites, select }: {
  panel: Exclude<Panel, null>; close: () => void; favorites: string[]; select: (index: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key !== 'Tab') return
      const nodes = ref.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]')
      if (!nodes?.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', key); previous?.focus() }
  }, [close])
  const available = flowers.map((f, i) => ({ ...f, index: i })).filter(f => panel !== 'garden' || favorites.includes(f.id))
  return <div className="dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) close() }}>
    <div className="dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <button className="icon-button dialog-close" onClick={close} aria-label="关闭窗口"><X size={20} /></button>
      <span className="eyebrow">A LITTLE WORLD OF FLOWERS</span>
      <h2 id="dialog-title">{panel === 'garden' ? '我的小小花园' : panel === 'story' ? '让心意，慢慢开花。' : '挑一朵，送给此刻的你'}</h2>
      {panel === 'story' ? <div className="story">
        <div className="story-mark"><Flower2 size={36} strokeWidth={1} /></div>
        <p>「花语」是花朵悄悄说的话。</p>
        <p>我们想在忙碌的日常里，留出一座小小的庭院。在这里，没有需要赶上的季节，只有轻轻摇曳的花，和可以慢下来的你。</p>
        <p>从日系手绘动画里的自然与温柔获得灵感，用柔和的暖色和真实的立体花瓣，记录那些微小而浪漫的瞬间。</p>
        <p className="story-foot">一朵花，一份心意。<br />May your ordinary days bloom.</p>
        <button className="primary-button" onClick={close}>回到花间 <ArrowRight size={16} /></button>
      </div> : <>
        <p className="dialog-description">{panel === 'garden' ? '把喜欢的花留在这里，随时回来看看。收藏保存在这台设备上。' : '不同的花语，同样温柔的心意。'}</p>
        {available.length ? <div className="dialog-flowers">{available.map(f => <button key={f.id} className="dialog-flower" onClick={() => { select(f.index); close() }}>
          <FlowerIllustration id={f.id} />
          <span><strong>{f.name}</strong><small>{f.meaning}</small></span>
          <ArrowRight size={17} />
        </button>)}</div> : <div className="empty-garden"><Heart size={32} strokeWidth={1} /><p>花园还在等待第一朵花。</p><span>点击花朵旁的爱心，把喜欢留下。</span><button className="primary-button" onClick={close}>去遇见一朵花 <ArrowRight size={16} /></button></div>}
        <p className="dialog-note">花语因文化与花色而异，这里收录的是我们喜爱的浪漫解读。</p>
      </>}
    </div>
  </div>
}

export default function App() {
  const [index, setIndex] = useState(0)
  const [blooming, setBlooming] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [sound, setSound] = useState(false)
  const [visible, setVisible] = useState(!document.hidden)
  const [reduced, setReduced] = useState(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [panel, setPanel] = useState<Panel>(null)
  const [favorites, setFavorites] = useState(loadFavorites)
  const [toast, setToast] = useState('')
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sceneKey, setSceneKey] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const controls = useRef({ rotation: 0, zoom: 1 })
  const dragStart = useRef(0), pinched = useRef(false)
  const ambience = useRef<ReturnType<typeof createAmbience> | null>(null)
  const flower = flowers[index]
  const saved = favorites.includes(flower.id)

  const choose = useCallback((value: number) => {
    setIndex((value + flowers.length) % flowers.length)
    setBlooming(false)
    controls.current = { rotation: 0, zoom: 1 }
  }, [])
  const step = useCallback((direction: number) => {
    setIndex(current => (current + direction + flowers.length) % flowers.length)
    setBlooming(false)
    controls.current = { rotation: 0, zoom: 1 }
  }, [])
  const closePanel = useCallback(() => setPanel(null), [])
  const onReady = useCallback(() => setReady(true), [])
  const onLost = useCallback(() => { setFailed(true); setReady(false) }, [])

  useGesture({
    onDrag: ({ first, last, movement: [x, y], pinching, canceled, touches }) => {
      if (first) { dragStart.current = controls.current.rotation; pinched.current = false }
      if (pinching || touches > 1) pinched.current = true
      if (pinched.current || canceled) return
      if (Math.abs(y) > Math.abs(x)) controls.current.rotation = dragStart.current + y * .012
      if (last && Math.abs(x) > 55 && Math.abs(x) > Math.abs(y) * 1.2) step(x < 0 ? 1 : -1)
    },
    onPinch: ({ offset: [scale] }) => {
      pinched.current = true
      controls.current.zoom = scale
    },
  }, {
    target: stage,
    eventOptions: { passive: false },
    drag: { filterTaps: true, threshold: 8 },
    pinch: { scaleBounds: { min: .75, max: 1.4 }, from: () => [controls.current.zoom, 0] },
  })

  useEffect(() => {
    const visibility = () => setVisible(!document.hidden)
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const preference = () => setReduced(query.matches)
    document.addEventListener('visibilitychange', visibility)
    query.addEventListener('change', preference)
    return () => { document.removeEventListener('visibilitychange', visibility); query.removeEventListener('change', preference) }
  }, [])
  useEffect(() => {
    if (sound && visible && !panel) void ambience.current?.resume()
    else void ambience.current?.pause()
  }, [sound, visible, panel])
  useEffect(() => () => ambience.current?.dispose(), [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (panel || (e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)))) return
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [step, panel])

  function toggleFavorite() {
    const next = saved ? favorites.filter(id => id !== flower.id) : [...favorites, flower.id]
    setFavorites(next)
    try {
      localStorage.setItem('hanakotoba-garden', JSON.stringify(next))
      setToast(saved ? '已从花园移出，喜欢仍在心里。' : `${flower.name}已种进你的小花园。`)
    } catch { setToast('已收藏到本次会话；浏览器暂时无法保存。') }
  }
  async function toggleSound() {
    try {
      if (!ambience.current) ambience.current = createAmbience()
      if (!sound) await ambience.current.resume()
      else await ambience.current.pause()
      setSound(!sound)
    } catch { setToast('暂时无法播放声音，请稍后再试。') }
  }
  function retry() { setReady(false); setFailed(false); setSceneKey(key => key + 1) }

  const fallback = <div className="scene-fallback"><FlowerIllustration id={flower.id} /><p>暂时无法打开 3D 花庭</p><button onClick={retry}>重新尝试 <RotateCw size={14} /></button></div>
  return <div className="app" style={{ '--flower-color': flower.color, '--flower-pale': flower.pale } as React.CSSProperties}>
    <header className="header">
      <a className="brand" href="#home" aria-label="花语小庭首页">
        <span className="brand-mark"><Flower2 size={28} strokeWidth={1.25} /></span>
        <span><strong>花语小庭</strong><small>HANAKOTOBA</small></span>
      </a>
      <nav className="navigation" aria-label="主导航">
        <button className={panel === null || panel === 'collection' ? 'nav-link active' : 'nav-link'} onClick={() => setPanel('collection')}>花间漫游<span /></button>
        <button className={panel === 'garden' ? 'nav-link active' : 'nav-link'} onClick={() => setPanel('garden')}>我的花园{favorites.length > 0 && <small className="favorite-count">{favorites.length}</small>}</button>
        <button className={panel === 'story' ? 'nav-link active' : 'nav-link'} onClick={() => setPanel('story')}>关于小庭</button>
      </nav>
      <button className={`sound-button ${sound ? 'is-on' : ''}`} onClick={toggleSound} aria-label={sound ? '关闭环境声音' : '开启环境声音'} aria-pressed={sound}>
        {sound ? <Volume2 size={17} strokeWidth={1.5} /> : <VolumeX size={17} strokeWidth={1.5} />}<span>{sound ? '听风与花' : '听见花开'}</span>
      </button>
    </header>

    <main id="home">
      <section className="hero" aria-label="互动花语庭院">
        <div className="intro">
          <div className="eyebrow intro-eyebrow"><span className="tiny-line" /> A MOMENT IN BLOOM</div>
          <h1>有些心意，<br />花会替你说<span className="title-dot">。</span></h1>
          <p className="intro-description">把日子过成一首温柔的诗，<br />从遇见一朵花开始。</p>
          <div className="intro-rule" />
          <p className="english-poem">A little bloom,<br /><em>a lot of love.</em></p>
          <div className="season-note"><span className="sun-mark">☼</span><span>小庭里，永远是好天气</span></div>
        </div>

        <div className="scene-wrap">
          <div className="scene-halo" />
          <span className="floating-label label-top"><span /><span className="desktop-label">在风里，慢慢盛开</span><span className="mobile-label">上下轻拖 · 双指缩放</span></span>
          <div className="scene" ref={stage} aria-label={`${flower.name}的互动三维花束。左右滑动切换花朵，上下拖动旋转，双指缩放。`} role="img">
            {!ready && !failed && <div className="scene-loader"><Flower2 size={26} strokeWidth={1} /><span>一朵花，正在醒来…</span></div>}
            {failed ? fallback : <SceneBoundary key={sceneKey} fallback={fallback} onError={onLost}>
              <Suspense fallback={null}>
                <FlowerScene flower={flower.id} blooming={blooming} rotating={rotating} motion={!reduced}
                  active={visible && panel === null} controls={controls} onReady={onReady} onLost={onLost} />
              </Suspense>
            </SceneBoundary>}
          </div>
          <div className="ground-shadow" />
          <div className="scene-caption"><span className="live-dot" /> {failed ? 'BOTANICAL COLLECTION' : 'LIVE 3D GARDEN'}<span className="caption-separator">/</span>每一瓣，都有温度</div>
          <div className="scene-tools">
            <button className={rotating ? 'is-on' : ''} onClick={() => setRotating(!rotating)} aria-pressed={rotating} title="自动旋转" aria-label={rotating ? '停止自动旋转' : '开启自动旋转'}><RotateCw size={17} strokeWidth={1.5} /></button>
            <span />
            <button onClick={() => { controls.current = { rotation: 0, zoom: 1 }; setRotating(false); setToast('已回到最初的视角。') }} title="重置视角" aria-label="重置花朵视角"><Maximize2 size={17} strokeWidth={1.5} /></button>
          </div>
        </div>

        <div className="flower-info" key={flower.id}>
          <div className="specimen-number"><span>{String(index + 1).padStart(2, '0')}</span><i />04</div>
          <div className="flower-name-row"><h2>{flower.name}</h2><button className={`favorite-button ${saved ? 'saved' : ''}`} onClick={toggleFavorite} aria-label={saved ? `取消收藏${flower.name}` : `收藏${flower.name}`} aria-pressed={saved}><Heart size={20} strokeWidth={1.3} fill={saved ? 'currentColor' : 'none'} /></button></div>
          <p className="latin-name">{flower.latin}</p>
          <span className="meaning-tag"><Leaf size={12} strokeWidth={1.5} />{flower.tag}</span>
          <div className="flower-poem"><span className="quote-mark">“</span><p>{flower.poem}</p></div>
          <div className="meaning-detail"><span>花 语</span><p>{flower.meaning}</p></div>
          <button className={`primary-button bloom-button ${blooming ? 'blooming' : ''}`} onClick={() => setBlooming(!blooming)} aria-pressed={blooming}>
            {blooming ? <Flower2 size={17} strokeWidth={1.4} /> : <Sparkles size={17} strokeWidth={1.4} />}{blooming ? '让心意含苞' : '让心意盛开'}<ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="flower-picker" aria-label="选择你的花朵">
        <div className="picker-heading"><span><span className="picker-title">今日，与你相遇的花</span><span className="picker-subtitle">PICK YOUR LITTLE HAPPINESS</span></span><span className="gesture-hint"><MoveHorizontal size={17} strokeWidth={1.3} />左右轻滑，让浪漫继续</span></div>
        <div className="flower-cards">
          {flowers.map((f, i) => <button className={`flower-card ${index === i ? 'selected' : ''}`} key={f.id} onClick={() => choose(i)} aria-pressed={index === i} aria-label={`欣赏${f.name}：${f.meaning}`}>
            <span className="card-art"><FlowerIllustration id={f.id} /></span>
            <span className="card-copy"><span className="card-name">{f.name}<small>{f.en}</small></span><span className="card-meaning">{f.tag}</span></span>
            <span className="card-state">{index === i ? <Check size={15} strokeWidth={1.4} /> : <ArrowRight size={14} strokeWidth={1.3} />}</span>
          </button>)}
        </div>
        <div className="mobile-pagination"><button onClick={() => step(-1)} aria-label="上一种花"><ChevronLeft size={18} /></button><span>{flowers.map((f, i) => <button key={f.id} className={index === i ? 'current' : ''} onClick={() => choose(i)} aria-label={`选择${f.name}`} aria-pressed={index === i} />)}</span><button onClick={() => step(1)} aria-label="下一种花"><ChevronRight size={18} /></button></div>
      </section>
    </main>
    <footer><span><Leaf size={13} strokeWidth={1.2} />在平凡的日子里，收集一点浪漫。</span><span>MADE WITH LOVE & A LITTLE MAGIC <Sparkles size={12} strokeWidth={1.2} /></span><button className="footer-story" onClick={() => setPanel('story')}>关于小庭</button></footer>
    {panel && <Dialog panel={panel} close={closePanel} favorites={favorites} select={choose} />}
    <div className={`toast ${toast ? 'show' : ''}`} role="status"><Check size={15} />{toast}</div>
    <span className="sr-only" aria-live="polite">{flower.name}，{flower.meaning}。{blooming ? '花朵已盛开。' : ''}</span>
  </div>
}
