// Adapted from bloom-animation's petalProfile.ts / petalMesh.ts.
// Copyright (c) 2026 Baimao, MIT. See THIRD_PARTY_NOTICES.md.
import * as THREE from 'three'

const stemEnd = .08

export function profileWidth(v: number, widths: readonly number[]) {
  const values = [.012, ...widths]
  if (v <= stemEnd) return values[0]
  if (v > .965) {
    const t = Math.min(1, (v - .965) / .035)
    return widths[4] * Math.sqrt(Math.max(0, 1 - t * t))
  }
  const t = (v - .08) / (.965 - .08)
  const scaled = Math.min(t * (values.length - 1), values.length - 1 - 1e-6)
  const i = Math.floor(scaled), f = scaled - i
  const p0 = values[Math.max(i - 1, 0)], p1 = values[i], p2 = values[i + 1], p3 = values[Math.min(i + 2, values.length - 1)]
  return Math.max(0, .5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f))
}

// A single tip vertex forms a fan. No collapsed final row or degenerate tip faces.
export function profileSurface(rows: number, cols: number, point: (u: number, t: number) => THREE.Vector3) {
  const positions: number[] = [], indices: number[] = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const p = point(i / cols * 2 - 1, j / rows)
      positions.push(p.x, p.y, p.z)
      if (j < rows - 1 && i < cols) {
        const a = j * (cols + 1) + i, b = a + cols + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const tip = point(0, 1), tipIndex = positions.length / 3
  positions.push(tip.x, tip.y, tip.z)
  const last = (rows - 1) * (cols + 1)
  for (let i = 0; i < cols; i++) indices.push(last + i, tipIndex, last + i + 1)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
