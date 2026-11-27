import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { FlowerId } from './data'
import { grassGeometry, meadowFlower, seededRandom, terrainHeight } from './meadowGeometry'
import { windMaterial } from './meadowMaterial'

export interface MeadowProps {
  flower: FlowerId; night: boolean; motion: boolean; active: boolean; detail: boolean
  bloomReplay: number
  pointer: React.RefObject<{ x: number; y: number }>
  onReady: () => void; onLost: () => void
}

type Environment = { time: number; night: number; reveal: number; wind: number; detailBloom: number }

function FlowerInstances({ id, palette, distant, count, env }: {
  id: FlowerId; palette: number; distant: boolean; count: number; env: React.RefObject<Environment>
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const { size } = useThree()
  const aspect = size.width / size.height
  const geometry = useMemo(() => meadowFlower(id, palette, distant), [id, palette, distant])
  const material = useMemo(() => windMaterial(), [])
  useLayoutEffect(() => {
    if (!ref.current) return
    const random = seededRandom(431 + palette * 712 + (distant ? 91 : 0))
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const z = distant ? -12 - random() * 51 : 6.2 - random() * 18
      const half = Math.min(38, Math.max(3, (8 - z) * .43 * aspect + 1.2))
      let x = (random() * 2 - 1) * half
      const path = Math.sin(z * .075) * 1.8
      if (Math.abs(x - path) < .45) x += x > path ? .8 : -.8
      dummy.position.set(x, terrainHeight(x, z), z)
      dummy.rotation.set((random() - .5) * .12, random() * Math.PI * 2, (random() - .5) * .2)
      const scale = .6 + random() * .53
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [count, aspect, distant, palette, geometry])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    material.uniforms.uTime.value = env.current.time
    material.uniforms.uNight.value = env.current.night
    material.uniforms.uReveal.value = env.current.reveal
    material.uniforms.uWind.value = env.current.wind
  })
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />
}

function FeaturedFlower({ id, env }: { id: FlowerId; env: React.RefObject<Environment> }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => meadowFlower(id, 0, false, true), [id])
  const material = useMemo(() => windMaterial(), [])
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    object.position.set(0, terrainHeight(0, 2.1), 2.1)
    object.rotation.y = -.3
    object.scale.setScalar(1.1)
    object.updateMatrix()
    ref.current?.setMatrixAt(0, object.matrix)
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [geometry])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    material.uniforms.uTime.value = env.current.time
    material.uniforms.uNight.value = env.current.night
    material.uniforms.uWind.value = env.current.wind
    material.uniforms.uReveal.value = env.current.detailBloom
  })
  return <instancedMesh ref={ref} args={[geometry, material, 1]} frustumCulled={false} />
}

function Grass({ env, low }: { env: React.RefObject<Environment>; low: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(grassGeometry, [])
  const material = useMemo(() => windMaterial(true), [])
  const count = low ? 1800 : 3000
  useLayoutEffect(() => {
    if (!ref.current) return
    const random = seededRandom(642), dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const x = (random() - .5) * 74, z = 7 - random() * 70
      dummy.position.set(x, terrainHeight(x, z), z)
      dummy.rotation.y = random() * Math.PI
      dummy.scale.setScalar(.6 + random() * .8)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [count])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  useFrame(() => {
    material.uniforms.uTime.value = env.current.time
    material.uniforms.uNight.value = env.current.night
    material.uniforms.uWind.value = env.current.wind
  })
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />
}

function Landscape({ env }: { env: React.RefObject<Environment> }) {
  const ground = useRef<THREE.MeshLambertMaterial>(null)
  const hills = useRef<THREE.Group>(null)
  const clouds = useRef<THREE.Mesh>(null)
  const terrain = useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 100, 64, 64)
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, 0, -35)
    const pos = geo.getAttribute('position'), colors: number[] = []
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      pos.setY(i, terrainHeight(x, z))
      const path = Math.abs(x - Math.sin(z * .075) * 1.8)
      const color = new THREE.Color('#8f9b5b').lerp(new THREE.Color('#d4bd88'), 1 - THREE.MathUtils.smoothstep(path, .22, .88))
      const patch = Math.sin(x * .8) * Math.cos(z * .5) * .035
      color.offsetHSL(0, 0, patch)
      colors.push(color.r, color.g, color.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])
  const cloudGeometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [], random = seededRandom(6512)
    for (let cloud = 0; cloud < 6; cloud++) {
      const x = (cloud - 2.5) * 17, y = 9 + random() * 5, z = -52 - random() * 12
      for (let j = 0; j < 6; j++) {
        const geo = new THREE.SphereGeometry(1, 12, 8)
        geo.scale(2.5 + random(), .65 + random(), 1.3)
        geo.translate(x + (j - 2.5) * 1.7, y + Math.sin(j * .9) * .5, z)
        parts.push(geo)
      }
    }
    const merged = mergeGeometries(parts)!
    parts.forEach(p => p.dispose())
    return merged
  }, [])
  const dayGround = useMemo(() => new THREE.Color('#ffffff'), [])
  const nightGround = useMemo(() => new THREE.Color('#3e5370'), [])
  const dayHill = useMemo(() => ['#97a172', '#abb081', '#bec398', '#a5b498'].map(c => new THREE.Color(c)), [])
  const nightHill = useMemo(() => new THREE.Color('#3b5261'), [])
  useEffect(() => () => { terrain.dispose(); cloudGeometry.dispose() }, [terrain, cloudGeometry])
  useFrame(() => {
    if (ground.current) ground.current.color.copy(dayGround).lerp(nightGround, env.current.night)
    hills.current?.children.forEach((hill, i) => {
      (hill as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>).material.color.copy(dayHill[i]).lerp(nightHill, env.current.night)
    })
    if (clouds.current) {
      const mat = clouds.current.material as THREE.MeshBasicMaterial
      mat.opacity = .5 * (1 - env.current.night) + .07
      clouds.current.position.x = Math.sin(env.current.time * .018) * 1.3
    }
  })
  return <>
    <mesh geometry={terrain}><meshLambertMaterial ref={ground} vertexColors /></mesh>
    <group ref={hills}>
      {[[-25, -2, -52, 30, 10, 18], [27, -3, -60, 34, 12, 21], [-10, -3, -73, 40, 15, 24], [29, -2, -83, 44, 18, 26]].map((p, i) =>
        <mesh key={i} position={p.slice(0, 3) as [number, number, number]} scale={p.slice(3) as [number, number, number]}>
          <sphereGeometry args={[1, 36, 20]} /><meshLambertMaterial color={dayHill[i]} />
        </mesh>)}
    </group>
    <mesh ref={clouds} geometry={cloudGeometry}><meshBasicMaterial color="#fff3dc" transparent opacity={.57} depthWrite={false} /></mesh>
  </>
}

function FloatingLights({ env }: { env: React.RefObject<Environment> }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const random = seededRandom(4241), positions = new Float32Array(160 * 3)
    for (let i = 0; i < 160; i++) {
      positions[i * 3] = (random() - .5) * 30
      positions[i * 3 + 1] = .6 + random() * 7
      positions[i * 3 + 2] = 4 - random() * 36
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
    vertexShader: `uniform float uTime; varying float vPulse; void main(){
      vec3 p=position; p.y+=sin(uTime*.6+position.x)*.25; p.x+=sin(uTime*.35+position.z)*.2;
      vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp(70./-mv.z,2.,14.); vPulse=.45+.55*sin(uTime*1.2+position.x*3.)*sin(uTime*1.2+position.x*3.);
    }`,
    fragmentShader: `uniform float uNight; varying float vPulse; void main(){
      float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d)*vPulse*mix(.28,.9,uNight);
      gl_FragColor=vec4(mix(vec3(1.,.83,.49),vec3(1.,.88,.6),uNight),a);
    }`,
  }), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  useFrame(() => {
    material.uniforms.uTime.value = env.current.time
    material.uniforms.uNight.value = env.current.night
  })
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}

function World(props: MeadowProps) {
  const { camera, gl, size, setDpr, invalidate } = useThree()
  const [displayed, setDisplayed] = useState(props.flower)
  const [low, setLow] = useState(false)
  const env = useRef<Environment>({ time: 0, night: props.night ? 1 : 0, reveal: 0, wind: 1, detailBloom: 1 })
  const bloomElapsed = useRef(0)
  const fog = useMemo(() => new THREE.FogExp2('#eec6a1', .015), [])
  const sun = useRef<THREE.DirectionalLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const frames = useRef(0), elapsed = useRef(0), profiled = useRef(false)
  const lookAt = useMemo(() => new THREE.Vector3(0, 1.25, -13), [])
  const targetLook = useMemo(() => new THREE.Vector3(), [])
  const dayFog = useMemo(() => new THREE.Color('#eec6a1'), [])
  const nightFog = useMemo(() => new THREE.Color('#253346'), [])
  const daySun = useMemo(() => new THREE.Color('#ffefd6'), [])
  const nightSun = useMemo(() => new THREE.Color('#b7caed'), [])
  const mobile = size.width < 700
  const farCount = low ? 160 : mobile ? 250 : 360
  const nearCount = low ? 27 : mobile ? 45 : 65
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); props.onLost() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [gl, props.onLost])
  useEffect(() => { if (!props.motion) setDisplayed(props.flower) }, [props.flower, props.motion])
  // Uniform changes need an explicit frame when reduced motion uses demand rendering.
  useEffect(() => { invalidate() }, [displayed, props.night, props.motion, props.detail, props.active, invalidate])
  useEffect(() => {
    bloomElapsed.current = 0
    env.current.detailBloom = props.detail && props.motion ? 0 : 1
    invalidate()
  }, [props.detail, props.bloomReplay, props.motion, invalidate])
  useFrame((state, delta) => {
    const dt = Math.min(delta, .06)
    env.current.time += props.motion ? dt : 0
    env.current.wind = props.motion ? 1 : 0
    if (props.detail && props.motion) {
      bloomElapsed.current += dt
      env.current.detailBloom = 1 - Math.pow(1 - Math.min(1, bloomElapsed.current / 3.4), 3.2)
    } else env.current.detailBloom = 1
    env.current.night = props.motion ? THREE.MathUtils.damp(env.current.night, props.night ? 1 : 0, 2.8, dt) : props.night ? 1 : 0
    const target = displayed === props.flower ? 1 : 0
    env.current.reveal = props.motion ? THREE.MathUtils.damp(env.current.reveal, target, 7, dt) : target
    if (target === 0 && env.current.reveal < .025) setDisplayed(props.flower)
    const night = env.current.night
    fog.color.copy(dayFog).lerp(nightFog, night)
    state.scene.fog = fog
    if (sun.current) { sun.current.intensity = 1.5 - night * .9; sun.current.color.copy(daySun).lerp(nightSun, night) }
    if (ambient.current) ambient.current.intensity = 1.1 - night * .45
    const drift = props.motion ? Math.sin(env.current.time * .11) * .13 : 0
    const follow = props.motion ? 1 - Math.exp(-dt * 3) : 1
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, props.detail ? 0 : props.pointer.current.x * .4 + drift, follow)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, props.detail ? 2.75 : 3.2, follow)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, props.detail ? 5.5 : 8, follow)
    targetLook.set(0, props.detail ? .8 : 1.25, props.detail ? 2.1 : -13)
    lookAt.lerp(targetLook, follow)
    camera.lookAt(lookAt)
    if (frames.current === 0) props.onReady()
    frames.current++; elapsed.current += delta
    if (!profiled.current && elapsed.current > 5) {
      if (frames.current / elapsed.current < 32) { setLow(true); setDpr(1) }
      profiled.current = true
    }
    if (env.current.reveal > .99 && target === 1) gl.domElement.dataset.flower = displayed
    else delete gl.domElement.dataset.flower
    gl.domElement.dataset.theme = Math.abs(night - (props.night ? 1 : 0)) < .01 ? props.night ? 'night' : 'day' : 'transition'
    gl.domElement.dataset.view = Math.abs(camera.position.z - (props.detail ? 5.5 : 8)) < .015 ? props.detail ? 'detail' : 'field' : 'transition'
    gl.domElement.dataset.bloom = props.detail && env.current.detailBloom < .995 ? 'opening' : 'open'
    if (frames.current % 60 === 0) {
      gl.domElement.dataset.drawCalls = String(gl.info.render.calls)
      gl.domElement.dataset.triangles = String(gl.info.render.triangles)
      gl.domElement.dataset.flowers = String((nearCount + farCount) * 3)
      gl.domElement.dataset.windTime = env.current.time.toFixed(2)
    }
  }, -1)
  return <>
    <ambientLight ref={ambient} intensity={1.1} color="#fff0dd" />
    <directionalLight ref={sun} position={[-10, 15, 8]} intensity={1.5} color="#ffefd6" />
    <Landscape env={env} />
    <Grass env={env} low={low} />
    {[0, 1, 2].map(palette => <group key={palette}>
      <FlowerInstances id={displayed} palette={palette} distant={false} count={nearCount} env={env} />
      <FlowerInstances id={displayed} palette={palette} distant count={farCount} env={env} />
    </group>)}
    {props.detail && <FeaturedFlower id={displayed} env={env} />}
    <FloatingLights env={env} />
  </>
}

export default function MeadowScene(props: MeadowProps) {
  return <Canvas dpr={[1, 1.5]} frameloop={props.active ? props.motion ? 'always' : 'demand' : 'never'}
    camera={{ fov: 48, position: [0, 3.2, 8], near: .1, far: 160 }}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.NoToneMapping }}>
    <World {...props} />
  </Canvas>
}
