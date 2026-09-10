import type { TopRuntime } from './physics'
import { ARENA } from './physics'

const METAL = ['#d7dee8', '#8b97ab', '#2a3344']

export function drawArena(ctx: CanvasRenderingContext2D, tops: TopRuntime[] | null, highlightPockets = true) {
  const { size, radius: R, pitRadius, railInner, railOuter, pocketAngles, pocketHalf } = ARENA
  const cx = size / 2
  const cy = size / 2

  ctx.clearRect(0, 0, size, size)
  const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, size * 0.7)
  bg.addColorStop(0, '#1a2438')
  bg.addColorStop(1, '#070b14')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R + 18, 0, Math.PI * 2)
  ctx.fillStyle = '#121826'
  ctx.fill()

  // Floor rings
  for (let i = 6; i >= 1; i--) {
    ctx.beginPath()
    ctx.arc(cx, cy, (R * i) / 6, 0, Math.PI * 2)
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(232,184,74,0.12)' : 'rgba(62,224,200,0.08)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Shallow center pit
  const pit = ctx.createRadialGradient(cx, cy, 4, cx, cy, pitRadius)
  pit.addColorStop(0, '#0a101c')
  pit.addColorStop(0.7, '#152033')
  pit.addColorStop(1, 'rgba(21,32,51,0)')
  ctx.beginPath()
  ctx.arc(cx, cy, pitRadius, 0, Math.PI * 2)
  ctx.fillStyle = pit
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, pitRadius, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(62,224,200,0.28)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Boost rail
  ctx.beginPath()
  ctx.arc(cx, cy, (railInner + railOuter) / 2, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,140,66,0.55)'
  ctx.lineWidth = railOuter - railInner
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, railOuter - 2, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,214,140,0.45)'
  ctx.lineWidth = 3
  ctx.stroke()

  // Pocket exits
  for (const ang of pocketAngles) {
    ctx.beginPath()
    ctx.arc(cx, cy, R + 2, ang - pocketHalf, ang + pocketHalf)
    ctx.strokeStyle = highlightPockets ? 'rgba(255,80,110,0.85)' : 'rgba(255,80,110,0.4)'
    ctx.lineWidth = 10
    ctx.stroke()
    const px = cx + Math.cos(ang) * (R + 22)
    const py = cy + Math.sin(ang) * (R + 22)
    ctx.fillStyle = 'rgba(255,80,110,0.16)'
    ctx.beginPath()
    ctx.arc(px, py, 18, 0, Math.PI * 2)
    ctx.fill()
  }

  // Outer metal ring (gaps at pockets)
  ctx.lineWidth = 14
  ctx.strokeStyle = '#9aa6b8'
  ctx.shadowColor = 'rgba(232,184,74,0.35)'
  ctx.shadowBlur = 12
  for (let i = 0; i < pocketAngles.length; i++) {
    const a0 = pocketAngles[i] + pocketHalf
    const a1 = pocketAngles[(i + 1) % pocketAngles.length] - pocketHalf + (i === pocketAngles.length - 1 ? Math.PI * 2 : 0)
    ctx.beginPath()
    ctx.arc(cx, cy, R + 6, a0, a1)
    ctx.stroke()
  }
  ctx.shadowBlur = 0

  if (tops) {
    for (const top of tops) drawTrail(ctx, top)
    for (const top of tops) drawTop(ctx, top)
  }
  ctx.restore()
}

function drawTrail(ctx: CanvasRenderingContext2D, top: TopRuntime) {
  if (top.trail.length < 2) return
  ctx.beginPath()
  ctx.moveTo(top.trail[0].x, top.trail[0].y)
  for (const p of top.trail) ctx.lineTo(p.x, p.y)
  ctx.strokeStyle = top.id === 1 ? 'rgba(62,224,200,0.35)' : 'rgba(255,140,66,0.35)'
  ctx.lineWidth = 3
  ctx.stroke()
}

function drawTop(ctx: CanvasRenderingContext2D, top: TopRuntime) {
  const { x, y } = top.body.position
  const r = ARENA.topRadius
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(top.spinAngle)

  if (!top.alive) ctx.globalAlpha = 0.28

  const attack = top.stats.type === 'attack'
  const stamina = top.stats.type === 'stamina'
  const defense = top.stats.type === 'defense'
  const c0 = attack ? '#ff8a4c' : stamina ? '#4ad6ff' : defense ? '#e8b84a' : '#c5b0ff'
  const c1 = attack ? '#8a2a12' : stamina ? '#164a62' : defense ? '#6a4a12' : '#3a2a62'

  ctx.beginPath()
  ctx.arc(0, 0, r + 4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fill()

  const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, r)
  g.addColorStop(0, METAL[0])
  g.addColorStop(0.35, c0)
  g.addColorStop(1, c1)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = METAL[0]
  ctx.stroke()

  const blades = top.stats.type === 'attack' ? 7 : top.stats.type === 'defense' ? 8 : 6
  ctx.fillStyle = 'rgba(10,14,22,0.45)'
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5)
    ctx.lineTo(Math.cos(a - 0.22) * r * 0.92, Math.sin(a - 0.22) * r * 0.92)
    ctx.lineTo(Math.cos(a + 0.22) * r * 0.92, Math.sin(a + 0.22) * r * 0.92)
    ctx.closePath()
    ctx.fill()
  }

  ctx.beginPath()
  ctx.arc(0, 0, 6, 0, Math.PI * 2)
  ctx.fillStyle = top.id === 1 ? '#3ee0c8' : '#ff8c42'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2)
  ctx.fillStyle = '#0b1020'
  ctx.fill()

  if (top.bursted) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#ff4d6d'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-12, -12)
    ctx.lineTo(12, 12)
    ctx.moveTo(12, -12)
    ctx.lineTo(-12, 12)
    ctx.stroke()
  }
  ctx.restore()
}
