import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { FlowerId } from './data'
import { flatPetal, leafGeometry, makeGradient, rosePetal, stemGeometry, tulipPetal } from './geometry'

export interface SceneProps {
  flower: FlowerId
  blooming: boolean
  rotating: boolean
  motion: boolean
  active: boolean
  controls: React.RefObject<{ rotation: number; zoom: number }>
  onReady: () => void
  onLost: () => void
}

function PaintedMaterial({ gradient, color = 'white' }: { gradient: THREE.Texture; color?: string }) {
  return <meshToonMaterial color={color} vertexColors gradientMap={gradient} side={THREE.DoubleSide} />
}

function Leaf({ position, rotation, length, width, curl, gradient }: {
  position: [number, number, number]; rotation: [number, number, number]
  length: number; width: number; curl: number; gradient: THREE.Texture
}) {
  const geometry = useMemo(() => leafGeometry(length, width, curl), [length, width, curl])
  const vein = useMemo(() => stemGeometry([[0, 0, .009], [0, length * .5, curl * .25 + .009], [0, length * .96, curl * .92 + .009]], .006), [length, curl])
  useEffect(() => () => { geometry.dispose(); vein.dispose() }, [geometry, vein])
  return <group position={position} rotation={rotation}>
    <mesh geometry={geometry}><PaintedMaterial gradient={gradient} /></mesh>
    <mesh geometry={vein}><meshToonMaterial color="#b5c08a" gradientMap={gradient} /></mesh>
  </group>
}

function FlowerHead({ id, palette, gradient, open }: { id: FlowerId; palette: number; gradient: THREE.Texture; open: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  const petals = useMemo(() => {
    if (id === 'tulip') return [tulipPetal(palette)]
    if (id === 'rose') return Array.from({ length: 5 }, (_, i) => rosePetal(i))
    return [flatPetal(id, 0), flatPetal(id, 1)]
  }, [id, palette])
  useEffect(() => () => petals.forEach(g => g.dispose()), [petals])
  const rings = id === 'rose' ? [4, 5, 7, 8, 9] : [id === 'tulip' ? 6 : id === 'daisy' ? 18 : 8]
  return <group ref={ref}>
    {rings.flatMap((count, layer) => Array.from({ length: count }, (_, i) => {
      const angle = i * Math.PI * 2 / count + layer * .63
      const rest = id === 'tulip' ? (i % 2 ? .02 : -.035) : 0
      const amount = id === 'tulip' ? .32 : id === 'rose' ? .05 + layer * .075 : .16
      return <group key={`${layer}-${i}`} rotation={[0, angle, 0]}>
        <group userData={{ petal: true, rest, amount }} rotation={[rest, 0, 0]}>
          <mesh geometry={petals[id === 'rose' ? layer : id === 'tulip' ? 0 : i % 2]}
            position={[0, id === 'rose' ? (4 - layer) * .018 : 0, id === 'tulip' && i % 2 ? -.014 : 0]}>
            <PaintedMaterial gradient={gradient} color={palette === 1 && id === 'rose' ? '#ffddc2' : 'white'} />
          </mesh>
        </group>
      </group>
    }))}
    {(id === 'cosmos' || id === 'daisy') && <>
      <mesh position={[0, .11, 0]} scale={[1, .45, 1]}><sphereGeometry args={[.17, 20, 12]} /><meshToonMaterial color="#d4a044" gradientMap={gradient} /></mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const a = i * 2.39996, r = .025 * Math.sqrt(i)
        return <mesh key={i} position={[Math.cos(a) * r, .175 - r * .14, Math.sin(a) * r]}>
          <sphereGeometry args={[.013, 5, 4]} /><meshToonMaterial color={i % 2 ? '#e9c16a' : '#b98735'} gradientMap={gradient} />
        </mesh>
      })}
    </>}
    <mesh position={[0, .015, 0]} scale={[1, .45, 1]}><sphereGeometry args={[id === 'tulip' ? .16 : .13, 12, 8]} /><meshToonMaterial color="#718751" gradientMap={gradient} /></mesh>
    <AnimatePetals root={ref} open={open} />
  </group>
}

function AnimatePetals({ root, open }: { root: React.RefObject<THREE.Group | null>; open: React.RefObject<number> }) {
  useFrame(() => {
    root.current?.children.forEach(child => {
      const pivot = child.children[0]
      if (pivot?.userData.petal) pivot.rotation.x = pivot.userData.rest + open.current * pivot.userData.amount
    })
  })
  return null
}

const stalks = [
  { top: [.12, 1.35, .12], base: [-.1, -1.62, 0], scale: 1, tilt: -.1, palette: 0 },
  { top: [.72, .75, -.28], base: [.12, -1.64, -.1], scale: .78, tilt: -.27, palette: 1 },
  { top: [-.64, .38, .22], base: [-.03, -1.64, .12], scale: .73, tilt: .24, palette: 2 },
]

function Stalk({ spec, id, gradient, open }: { spec: typeof stalks[number]; id: FlowerId; gradient: THREE.Texture; open: React.RefObject<number> }) {
  const points = [spec.base, [spec.base[0] + .12, -.7, spec.base[2]], [spec.top[0] * .5, .2, spec.top[2]], spec.top]
  const stem = useMemo(() => stemGeometry(points), [spec])
  useEffect(() => () => stem.dispose(), [stem])
  const broad = id === 'tulip'
  return <group>
    <mesh geometry={stem}><meshToonMaterial color="#7e925c" gradientMap={gradient} /></mesh>
    <group position={spec.top as [number, number, number]} rotation={[id === 'tulip' ? .08 : .38, 0, spec.tilt]} scale={spec.scale}>
      <FlowerHead id={id} palette={spec.palette} gradient={gradient} open={open} />
    </group>
    <Leaf position={[spec.base[0], -.85, spec.base[2]]} rotation={[.1, spec.palette * 2.1, .68]}
      length={broad ? 1.75 : 1.03} width={broad ? .21 : .18} curl={broad ? .38 : .17} gradient={gradient} />
    <Leaf position={[spec.base[0] + .08, -.45, spec.base[2]]} rotation={[-.12, spec.palette * 1.9 + .8, -.7]}
      length={broad ? 1.63 : .88} width={broad ? .18 : .16} curl={broad ? .38 : .22} gradient={gradient} />
    {!broad && <Leaf position={[spec.top[0] * .45, .05, spec.top[2]]} rotation={[.15, spec.palette * 2.5, .83]}
      length={.6} width={.12} curl={.15} gradient={gradient} />}
  </group>
}

function Ribbon({ gradient }: { gradient: THREE.Texture }) {
  return <group position={[.02, -1.03, .13]} rotation={[.04, 0, -.12]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, .65]}><torusGeometry args={[.095, .018, 6, 24]} /><meshToonMaterial color="#d5ba8f" gradientMap={gradient} /></mesh>
    {[-1, 1].map(sign => <mesh key={sign} position={[sign * .13, .01, .03]} rotation={[.1, 0, sign * .38]} scale={[1.6, .7, .35]}>
      <torusGeometry args={[.095, .013, 6, 20]} /><meshToonMaterial color="#d5ba8f" gradientMap={gradient} />
    </mesh>)}
  </group>
}

function Bouquet({ flower, blooming, rotating, motion, controls }: SceneProps) {
  const { gl } = useThree()
  const [displayed, setDisplayed] = useState(flower)
  const group = useRef<THREE.Group>(null)
  const size = useRef(0)
  const open = useRef(.45)
  const turn = useRef(-.3)
  const time = useRef(0)
  const gradient = useMemo(makeGradient, [])
  useEffect(() => () => gradient.dispose(), [gradient])
  useEffect(() => { if (!motion) setDisplayed(flower) }, [flower, motion])
  useFrame((_, delta) => {
    if (!group.current) return
    const dt = Math.min(delta, .06)
    time.current += dt
    const target = displayed === flower ? 1 : 0
    size.current = motion ? THREE.MathUtils.damp(size.current, target, 9, dt) : target
    if (target === 0 && size.current < .025) setDisplayed(flower)
    open.current = motion ? THREE.MathUtils.damp(open.current, blooming ? 1 : .08, 3, dt) : blooming ? 1 : .08
    if (motion && rotating) turn.current += dt * .15
    group.current.rotation.y = turn.current + controls.current.rotation
    group.current.rotation.z = motion ? Math.sin(time.current * .65) * .016 : 0
    group.current.position.y = motion ? Math.sin(time.current * .8) * .025 : 0
    const s = size.current * controls.current.zoom
    group.current.scale.setScalar(s)
    // Expose settled visual state so UI verification can wait for real animation completion.
    if (displayed === flower && size.current > .99) {
      gl.domElement.dataset.flower = displayed
    } else delete gl.domElement.dataset.flower
    gl.domElement.dataset.bloom = Math.abs(open.current - (blooming ? 1 : .08)) < .01 ? String(blooming) : 'transition'
  })
  return <group ref={group}>
    {stalks.map((spec, i) => <Stalk key={`${displayed}-${i}`} spec={spec} id={displayed} gradient={gradient} open={open} />)}
    <Ribbon gradient={gradient} />
  </group>
}

function Fireflies({ motion }: { motion: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(38 * 3)
    for (let i = 0; i < 38; i++) {
      // Deterministic distribution keeps the visual consistent on reload.
      positions[i * 3] = Math.sin(i * 127.1) * 2.2
      positions[i * 3 + 1] = Math.cos(i * 311.7) * 2.2 + .6
      positions[i * 3 + 2] = Math.sin(i * 74.7) * 1.1 - .6
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((state) => {
    if (ref.current && motion) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * .05) * .2
      ref.current.position.y = Math.sin(state.clock.elapsedTime * .2) * .07
    }
  })
  return <points ref={ref} geometry={geometry}><pointsMaterial color="#d7b677" size={.025} sizeAttenuation transparent opacity={.62} depthWrite={false} /></points>
}

function CameraAndHealth({ onReady, onLost }: Pick<SceneProps, 'onReady' | 'onLost'>) {
  const { camera, size, gl, setDpr } = useThree()
  const frames = useRef(0), elapsed = useRef(0), adjusted = useRef(false)
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    cam.zoom = Math.min(size.width / 5.1, size.height / 5.15)
    cam.position.set(0, 2.6, 10)
    cam.lookAt(0, .55, 0)
    cam.updateProjectionMatrix()
  }, [camera, size])
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (e: Event) => { e.preventDefault(); onLost() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [gl, onLost])
  useFrame((_, delta) => {
    if (frames.current === 2) onReady()
    frames.current++
    elapsed.current += delta
    if (!adjusted.current && elapsed.current > 4) {
      if (frames.current / elapsed.current < 40) setDpr(1)
      gl.domElement.dataset.drawCalls = String(gl.info.render.calls)
      gl.domElement.dataset.triangles = String(gl.info.render.triangles)
      adjusted.current = true
    }
  })
  return null
}

export default function FlowerScene(props: SceneProps) {
  return <Canvas orthographic dpr={[1, 1.65]} frameloop={props.active ? 'always' : 'never'}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    camera={{ position: [0, 2.6, 10], near: .1, far: 40 }}
    onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.NoToneMapping }}>
    <ambientLight intensity={1.15} color="#fff2dd" />
    <directionalLight position={[-3, 6, 5]} intensity={1.65} color="#fff0d3" />
    <directionalLight position={[4, 3, -2]} intensity={.55} color="#ffd5b5" />
    <Bouquet {...props} />
    <Fireflies motion={props.motion} />
    <CameraAndHealth onReady={props.onReady} onLost={props.onLost} />
  </Canvas>
}
