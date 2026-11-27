import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { flatPetal, leafGeometry, tulipPetal } from './geometry'
import { completeBloomAttributes, foldedPetal, spiralRosePetal, transformBloomGeometry } from './botany/bloomGeometry'
import type { FlowerId } from './data'

// The same terrain function places roots and sculpts the meadow.
export function terrainHeight(x: number, z: number) {
  return -.4 + Math.sin(x * .14 + z * .09) * .34 + Math.cos(z * .15) * .3
}

function colored(geometry: THREE.BufferGeometry, color?: string) {
  geometry.deleteAttribute('uv')
  if (!geometry.getAttribute('color')) {
    const c = new THREE.Color(color || '#718749'), values = []
    for (let i = 0; i < geometry.getAttribute('position').count; i++) values.push(c.r, c.g, c.b)
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(values, 3))
  }
  return geometry
}

export function meadowFlower(id: FlowerId, palette: number, distant: boolean, featured = false) {
  const geometries: THREE.BufferGeometry[] = []
  const rows = featured ? 16 : distant ? 3 : id === 'rose' ? 8 : 10, cols = featured ? 10 : distant ? 3 : id === 'rose' ? 6 : 8
  const headHeight = id === 'tulip' ? 1.45 : 1.55
  const add = (geo: THREE.BufferGeometry, position: THREE.Vector3, rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1), color?: string) => {
    colored(geo, color)
    transformBloomGeometry(geo, new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(rotation), scale))
    completeBloomAttributes(geo)
    geometries.push(geo)
  }
  const stemCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(.1, .7, .04), new THREE.Vector3(.08, headHeight, 0))
  add(new THREE.TubeGeometry(stemCurve, distant ? 4 : 8, .018, 4, false), new THREE.Vector3(), undefined, undefined, '#648349')
  const leafLength = id === 'tulip' ? 1.1 : .63
  for (let i = 0; i < 2; i++) {
    add(leafGeometry(leafLength, id === 'tulip' ? .16 : .14, .32, distant ? 4 : 8, 4),
      new THREE.Vector3(.03, .22 + i * .25, .01), new THREE.Euler(.08, i * 2.8 + palette * .9, i ? -.64 : .72))
  }
  if (id === 'rose') {
    const count = featured ? 44 : distant ? 18 : 30
    for (let i = 0; i < count; i++) {
      const radial = i / (count - 1), angle = i * Math.PI * (3 - Math.sqrt(5))
      const seed = i * 2.39996 + palette * 1.7
      const radius = .165 * Math.pow(radial, 1.15)
      const position = new THREE.Vector3(Math.sin(angle) * radius, .17 * (1 - Math.pow(radial, 1.2)), Math.cos(angle) * radius)
      const scale = new THREE.Vector3().setScalar(.33 + radial * .67)
      const jitter = Math.sin(seed * 4.7) * .025
      const openMatrix = new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(new THREE.Euler(-.18 - 1.02 * Math.pow(radial, 2.1), angle + Math.PI, jitter, 'YXZ')), scale)
      const budMatrix = new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(new THREE.Euler(-.18, angle + Math.PI, jitter, 'YXZ')), scale)
      const petal = spiralRosePetal(radial, palette, seed, rows, cols)
      petal.applyMatrix4(openMatrix)
      const budPosition = petal.getAttribute('aBudPosition') as THREE.BufferAttribute
      const budNormal = petal.getAttribute('aBudNormal') as THREE.BufferAttribute
      budPosition.applyMatrix4(budMatrix)
      budNormal.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(budMatrix))
      add(petal, new THREE.Vector3(.08, headHeight, 0), new THREE.Euler(.32, 0, -.06), new THREE.Vector3().setScalar(.72))
    }
  }
  const rings = id === 'rose' ? [] : [id === 'tulip' ? 6 : id === 'daisy' ? 15 : 8]
  rings.forEach((count, layer) => {
    for (let i = 0; i < count; i++) {
      const petal = id === 'tulip' ? tulipPetal(palette, rows, cols) : flatPetal(id, palette % 2, featured ? 16 : distant ? 3 : 7, featured ? 10 : distant ? 3 : 5)
      foldedPetal(petal, id, i / count * .18)
      const angle = i * Math.PI * 2 / count + layer * .74
      const matrix = new THREE.Matrix4().makeRotationY(angle)
      matrix.multiply(new THREE.Matrix4().makeRotationX(id === 'tulip' ? .13 + (i % 2) * .055 : .05))
      transformBloomGeometry(petal, matrix)
      add(petal, new THREE.Vector3(.08, headHeight, 0), new THREE.Euler(id === 'tulip' ? -.04 : .32, 0, -.06), new THREE.Vector3(id === 'tulip' ? .7 : 1, id === 'tulip' ? .7 : 1, id === 'tulip' ? .7 : 1))
    }
  })
  if (id === 'daisy' || id === 'cosmos') {
    add(new THREE.SphereGeometry(.16, distant ? 6 : 12, 6), new THREE.Vector3(.08, headHeight + .11, .025), undefined, new THREE.Vector3(1, .5, 1), '#d5a13d')
  }
  const merged = mergeGeometries(geometries)!
  geometries.forEach(g => g.dispose())
  return merged
}

export function grassGeometry() {
  const geo = new THREE.PlaneGeometry(.055, .9, 1, 4)
  geo.translate(0, .45, 0)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    pos.setX(i, pos.getX(i) * (1 - y / .95))
    pos.setZ(i, y * y * .14)
  }
  geo.computeVertexNormals()
  return completeBloomAttributes(colored(geo, '#8b9b56'))
}

export function seededRandom(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
