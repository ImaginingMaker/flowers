import * as THREE from 'three'
import type { FlowerId } from './data'
import { profileSurface, profileWidth } from './botany/petalProfile'

function surface(fn: (u: number, t: number) => THREE.Vector3, base: string, tip: string, rows = 24, cols = 20) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const dark = new THREE.Color(base), light = new THREE.Color(tip)
  for (let j = 0; j <= rows; j++) {
    const t = j / rows
    for (let i = 0; i <= cols; i++) {
      const u = i / cols * 2 - 1, p = fn(u, t)
      positions.push(p.x, p.y, p.z)
      const c = dark.clone().lerp(light, Math.min(1, t * .8 + Math.abs(u) * .16))
      // Painted variations live on the surface, not in an external texture.
      c.multiplyScalar(1 + .025 * Math.sin(u * 23 + t * 12))
      colors.push(c.r, c.g, c.b)
      if (j < rows && i < cols) {
        const a = j * (cols + 1) + i, b = a + cols + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function tulipPetal(palette: number, rows = 24, cols = 20) {
  const tones = [['#c9614f', '#f2a389'], ['#d79b43', '#f3cb80'], ['#d28770', '#f9bfa3']]
  return surface((u, t) => {
    const angle = u * .66
    const r = .025 + .47 * Math.sin(t * Math.PI * .68)
    const y = t * 1.13 - .14 * u * u * Math.pow(t, 5)
    return new THREE.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r)
  }, ...tones[palette] as [string, string], rows, cols)
}

export function flatPetal(id: FlowerId, variation: number, rows = 18, cols = 12) {
  const daisy = id === 'daisy'
  const widths = daisy ? [.025, .048, .067, .08, .06] : [.065, .14, .20, .22, .17]
  const geometry = profileSurface(rows, cols, (u, t) => {
    const width = profileWidth(t, widths)
    const length = daisy ? .59 : .75
    return new THREE.Vector3(u * width, .04 + (daisy ? .06 : .10) * t * t + .03 * u * u + .012 * Math.sin(t * 19) * u * u, .07 + length * t)
  })
  const base = new THREE.Color(daisy ? '#decf9e' : variation ? '#ce8c57' : '#de9c68')
  const tip = new THREE.Color(daisy ? '#fff8e8' : '#f5c69b')
  const colors: number[] = []
  for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) {
    const c = base.clone().lerp(tip, j / rows * .9 + Math.abs(i / cols * 2 - 1) * .1)
    colors.push(c.r, c.g, c.b)
  }
  colors.push(tip.r, tip.g, tip.b)
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

export function leafGeometry(length: number, width: number, curl: number, rows = 20, cols = 10) {
  return surface((u, t) => {
    const w = width * Math.pow(Math.sin(Math.PI * t), .85)
    return new THREE.Vector3(u * w, t * length, curl * t * t + Math.abs(u) * w * .27)
  }, '#526744', '#a2b579', rows, cols)
}
