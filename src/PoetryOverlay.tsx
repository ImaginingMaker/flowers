import { useEffect, useRef, useState } from 'react'
import { openingLines, poem } from './poetry'

interface Props { reading: boolean; flowerIndex: number; night: boolean; reduced: boolean }

export default function PoetryOverlay({ reading, flowerIndex, night, reduced }: Props) {
  const target = `${reading}:${flowerIndex}:${night}`
  const [displayed, setDisplayed] = useState({ reading, flowerIndex, night, key: target })
  const [visible, setVisible] = useState(false)
  const frame = useRef(0)
  useEffect(() => {
    if (reduced) {
      setDisplayed({ reading, flowerIndex, night, key: target })
      setVisible(true)
      return
    }
    if (target === displayed.key) {
      frame.current = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame.current)
    }
    setVisible(false)
    const timer = setTimeout(() => {
      setDisplayed({ reading, flowerIndex, night, key: target })
      frame.current = requestAnimationFrame(() => setVisible(true))
    }, 620)
    return () => { clearTimeout(timer); cancelAnimationFrame(frame.current) }
  }, [target, displayed.key, reading, flowerIndex, night, reduced])
  return <div className={`poetry-overlay ${displayed.reading ? 'specimen-poetry' : 'meadow-poetry'} ${visible ? 'visible' : ''}`}
    data-view={displayed.reading ? 'text' : 'home'} data-state={visible ? 'visible' : 'fading'} aria-live="polite">
    <div className="margin-note left-note">{displayed.reading ? poem.margin : <>A SMALL WORLD.<br />MADE OF ORDINARY<br />LITTLE WONDERS.</>}</div>
    <div className="margin-note right-note">{displayed.reading ? <>MOVING WITH THE WIND.<br />OPENING IN ITS<br />OWN GOOD TIME.</> : <>SUNLIGHT, PETALS,<br />AND NOWHERE ELSE<br />YOU NEED TO BE.</>}</div>
    <div className="poetry-copy">
      <span className="chapter-label">{displayed.reading ? poem.chapter : displayed.night ? 'UNDER A TENDER MOON' : 'A MOMENT IN BLOOM'}</span>
      <h1>{displayed.reading ? poem.title : (displayed.night ? <>Under the same sky,<br /><em>dream a little.</em></> : openingLines[displayed.flowerIndex])}</h1>
      <p>{displayed.reading ? poem.note : 'Take your time. There is nowhere else to be.'}</p>
    </div>
  </div>
}
