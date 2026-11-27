import * as THREE from 'three'
import type { FlowerId } from './data'

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

export function tulipPetal(palette: number) {
  const tones = [['#c9614f', '#f2a389'], ['#d79b43', '#f3cb80'], ['#d28770', '#f9bfa3']]
  return surface((u, t) => {
    const angle = u * .66
    const r = .025 + .47 * Math.sin(t * Math.PI * .68)
    const y = t * 1.13 - .14 * u * u * Math.pow(t, 5)
    return new THREE.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r)
  }, ...tones[palette] as [string, string])
}

export function rosePetal(layer: number) {
  return surface((u, t) => {
    const angle = u * (.66 + layer * .045)
    const radius = .018 + (.15 + layer * .095) * Math.sin(t * (layer === 0 ? 2.65 : layer === 1 ? 2.1 : 1.55))
    const curl = Math.pow(t, 6) * (.035 + layer * .02)
    return new THREE.Vector3(Math.sin(angle) * radius,
      t * (.56 + layer * .025) - Math.pow(t, 3) * layer * .048 - .06 * u * u * t,
      Math.cos(angle) * radius + curl)
  }, layer < 2 ? '#a64e54' : '#ba6268', layer < 2 ? '#da9385' : '#efb0a0')
}

export function flatPetal(id: FlowerId, variation: number) {
  const daisy = id === 'daisy'
  return surface((u, t) => {
    const width = (daisy ? .09 : .22) * Math.pow(Math.sin(Math.PI * t), .65)
    const length = daisy ? .59 : .75
    return new THREE.Vector3(u * width, .05 + .19 * t * t + .05 * u * u + .025 * Math.sin(t * 19) * Math.abs(u),
      .07 + length * t)
  }, daisy ? '#dfcf9d' : variation ? '#ce8c57' : '#de9c68', daisy ? '#fff5db' : '#f5c69b', 18, 12)
}

export function leafGeometry(length: number, width: number, curl: number) {
  return surface((u, t) => {
    const w = width * Math.pow(Math.sin(Math.PI * t), .85)
    return new THREE.Vector3(u * w, t * length, curl * t * t + Math.abs(u) * w * .27)
  }, '#526744', '#a2b579', 20, 10)
}

export function stemGeometry(points: number[][], radius = .026) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number]))),
    24, radius, 7, false,
  )
}

export function makeGradient() {
  const gradient = new THREE.DataTexture(new Uint8Array([100, 146, 186, 216, 244]), 5, 1, THREE.RedFormat)
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter
  gradient.generateMipmaps = false
  gradient.needsUpdate = true
  return gradient
}
