import * as THREE from 'three'
import { profileSurface, profileWidth } from './petalProfile'
import type { FlowerId } from '../data'

const rosePalettes = [
  ['#8b4055', '#bc6375', '#df8f91', '#efb2a6', '#f6cab5'],
  ['#a76350', '#c88d6e', '#e7b08c', '#f1c6a3', '#f9dfbc'],
  ['#9b5864', '#c87f87', '#e6a4a2', '#f3c0b0', '#f8d4bb'],
]
const roseColors = rosePalettes.map(palette => palette.map(color => new THREE.Color(color)))

function roseColor(t: number, radial: number, palette: number) {
  const values = roseColors[palette]
  const f = THREE.MathUtils.clamp(t * .25 + radial * .75, 0, 1) * 4
  const index = Math.min(3, Math.floor(f))
  return values[index].clone().lerp(values[index + 1], THREE.MathUtils.smoothstep(f - index, 0, 1))
}

export function completeBloomAttributes(geometry: THREE.BufferGeometry) {
  if (!geometry.getAttribute('aBudPosition')) {
    geometry.setAttribute('aBudPosition', geometry.getAttribute('position').clone())
    geometry.setAttribute('aBudNormal', geometry.getAttribute('normal').clone())
    geometry.setAttribute('aPetal', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count).fill(-1), 1))
  }
  return geometry
}

export function transformBloomGeometry(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  geometry.applyMatrix4(matrix)
  const budPosition = geometry.getAttribute('aBudPosition') as THREE.BufferAttribute | undefined
  const budNormal = geometry.getAttribute('aBudNormal') as THREE.BufferAttribute | undefined
  budPosition?.applyMatrix4(matrix)
  budNormal?.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(matrix))
}

export function attachBud(open: THREE.BufferGeometry, bud: THREE.BufferGeometry, order: number) {
  open.setAttribute('aBudPosition', bud.getAttribute('position').clone())
  open.setAttribute('aBudNormal', bud.getAttribute('normal').clone())
  open.setAttribute('aPetal', new THREE.Float32BufferAttribute(new Float32Array(open.getAttribute('position').count).fill(order), 1))
  bud.dispose()
  return open
}

// CPU-baked centreline integration: evaluated only when building a model.
// Both poses are shared by every flower instance; the GPU only blends them.
export function spiralRosePetal(radial: number, palette: number, seed: number, rows: number, cols: number) {
  const widths = [.10, .22, .29, .25, .16]
  const build = (open: boolean) => profileSurface(rows, cols, (u, t) => {
    let angle = 0, y = 0, z = 0
    const ds = t / 20, curl = open ? -.32 : 1.72
    for (let i = 0; i < 20; i++) {
      const s = (i + .5) * ds
      angle += curl * 2.2 * Math.pow(s, 1.2) * ds
      y += Math.cos(angle) * ds
      z += Math.sin(angle) * ds
    }
    const width = profileWidth(t, widths) * (open ? 1 : 1.24)
    const x = u * width * (1 + .035 * u * Math.sin(seed))
    const cup = -.34 * (1 - u * u) * width
    const ripple = open ? .012 * u * u * Math.sin(t * 15 + seed) : 0
    const roll = open ? .34 * x : .08 * x
    const rolledX = x * Math.cos(roll) - (cup + ripple) * Math.sin(roll)
    const rolledZ = x * Math.sin(roll) + (cup + ripple) * Math.cos(roll)
    return new THREE.Vector3(rolledX, y * .94 - Math.sin(angle) * rolledZ, z * .94 + Math.cos(angle) * rolledZ)
  })
  const open = build(true), bud = build(false), colors: number[] = []
  for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) {
    const c = roseColor(j / rows, radial, palette)
    colors.push(c.r, c.g, c.b)
  }
  const tip = roseColor(1, radial, palette)
  colors.push(tip.r, tip.g, tip.b)
  open.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return attachBud(open, bud, 1 - radial)
}

export function foldedPetal(geometry: THREE.BufferGeometry, id: FlowerId, order: number) {
  const bud = geometry.clone(), pos = bud.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    if (id === 'tulip') {
      const t = THREE.MathUtils.clamp(y / 1.13, 0, 1)
      const radiusScale = 1 - .58 * Math.pow(t, 1.3)
      pos.setXYZ(i, x * radiusScale, y * 1.03, z * radiusScale)
    } else {
      const angle = -1.18, cos = Math.cos(angle), sin = Math.sin(angle)
      pos.setXYZ(i, x * .48, y * cos - z * sin, y * sin + z * cos)
    }
  }
  bud.computeVertexNormals()
  return attachBud(geometry, bud, order)
}
