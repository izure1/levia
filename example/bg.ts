import { World } from '../src/index.js'

const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement

function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
resizeCanvas()
window.addEventListener('resize', resizeCanvas)

const world = new World({ canvas })

// Configure camera for depth
const camera = world.createCamera({
  attribute: { physics: 'dynamic' },
  transform: { position: { x: 0, y: 0, z: 0 } }
})
world.camera = camera
world.setGravity({ x: 0, y: 0 })

// Neon color palette for a Sci-Fi Cyberpunk/Synthwave vibe
const colors = ['#ff0055', '#00eeff', '#aa00ff', '#ffdd00', '#ffffff']

const particles: { obj: any, angle: number, radius: number, speed: number, zSpeed: number }[] = []

// 1. Vortex Tunnel Particles
for (let i = 0; i < 1500; i++) {
  const tunnelRadius = Math.random() * 1500 + 200
  const angle = Math.random() * Math.PI * 2
  const z = Math.random() * 4200 - 200

  const x = Math.cos(angle) * tunnelRadius
  const y = Math.sin(angle) * tunnelRadius

  // Closer particles are larger
  const size = Math.random() * 5 + 1.5
  const color = colors[Math.floor(Math.random() * colors.length)]

  const p = world.createEllipse({
    style: {
      width: size,
      height: size,
      color,
      blendMode: 'lighter',
      opacity: Math.random() * 0.6 + 0.2, // Glowing transparency
      pointerEvents: false, // Performance optimize, ignore mouse raycast
      boxShadowColor: color, // Extends glow
      boxShadowBlur: 10
    },
    transform: { position: { x, y, z } }
  })

  particles.push({
    obj: p,
    angle,
    radius: tunnelRadius,
    speed: (Math.random() * 0.01 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
    zSpeed: Math.random() * 10 + 15
  })
}

// 2. Central Nebula Core Particles
for (let i = 0; i < 500; i++) {
  const coreRadius = Math.random() * 300
  const angle = Math.random() * Math.PI * 2
  const z = Math.random() * 4200 - 200

  const p = world.createEllipse({
    style: {
      width: 2,
      height: 2,
      color: '#ffffff',
      blendMode: 'lighter',
      opacity: Math.random() * 0.8 + 0.2,
      pointerEvents: false
    },
    transform: { position: { x: Math.cos(angle) * coreRadius, y: Math.sin(angle) * coreRadius, z } }
  })

  particles.push({
    obj: p,
    angle,
    radius: coreRadius,
    speed: Math.random() * 0.02,
    zSpeed: Math.random() * 5 + 5
  })
}

// Fly-through vortex effect animation
world.on('update', () => {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]

    // Rotate around the Z axis
    p.angle += p.speed
    p.obj.transform.position.x = Math.cos(p.angle) * p.radius
    p.obj.transform.position.y = Math.sin(p.angle) * p.radius

    // Warp speed straight towards the camera (Z decreases as it gets closer)
    p.obj.transform.position.z -= p.zSpeed

    // Loop back deeply when passing camera
    if (p.obj.transform.position.z < -200) {
      p.obj.transform.position.z = 4000
    }
  }
})

// Parallax effect with organic camera sway based on mouse
let targetRx = 0
let targetRy = 0

window.addEventListener('mousemove', (e) => {
  // Use global window event to always track mouse smoothly over cards
  targetRx = -(e.clientY / window.innerHeight - 0.5) * 80
  targetRy = -(e.clientX / window.innerWidth - 0.5) * 80
})

world.on('update', () => {
  // Smoothly interpolate camera rotation
  camera.transform.rotation.x += (targetRx - camera.transform.rotation.x) * 0.05
  camera.transform.rotation.y += (targetRy - camera.transform.rotation.y) * 0.05

  // Continuously spin barrel-roll for space disorientation effect
  camera.transform.rotation.z += 0.08
})

world.start()
