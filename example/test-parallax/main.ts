import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()

world.camera = camera

const layers = [
  { z: 800, count: 6, size: 180, colors: ['#1a1a3e', '#0d0d2b', '#16163a'] },
  { z: 500, count: 8, size: 100, colors: ['#2a0a4e', '#1e0a3e', '#3a0a5e'] },
  { z: 300, count: 10, size: 60, colors: ['#4b0082', '#6a0dad', '#7b2fbe'] },
  { z: 150, count: 12, size: 36, colors: ['#9b30ff', '#c77dff', '#e0aaff'] },
]

const rand = (min: number, max: number) => Math.random() * (max - min) + min

for (const layer of layers) {
  for (let i = 0; i < layer.count; i++) {
    const color = layer.colors[Math.floor(Math.random() * layer.colors.length)]
    world.createEllipse({
      attribute: {
        className: 'parallax-layer'
      },
      style: {
        color,
        opacity: rand(0.3, 0.8),
        width: rand(layer.size * 0.5, layer.size * 1.5),
        height: rand(layer.size * 0.3, layer.size),
        blur: rand(2, 8),
      },
      transform: {
        position: {
          x: rand(-1200, 1200),
          y: rand(-700, 700),
          z: layer.z + rand(-50, 50),
        },
      },
    })
  }
}

for (let i = 0; i < 25; i++) {
  const size = rand(4, 18)
  world.createRectangle({
    attribute: {
      className: 'parallax-layer'
    },
    style: {
      color: `hsl(${rand(200, 300)}, 80%, 70%)`,
      opacity: rand(0.4, 1.0),
      width: size,
      height: size,
      borderRadius: 2,
    },
    transform: {
      position: { x: rand(-900, 900), y: rand(-500, 500), z: rand(60, 130) },
      rotation: { z: rand(0, 45) },
    },
  })
}

world.createText({
  attribute: { text: 'Lve4' },
  style: { color: '#ffffff', opacity: 0.95, fontSize: 72, fontFamily: 'Segoe UI, sans-serif', fontWeight: 'bold', textAlign: 'center' },
  transform: { position: { x: -100, y: -30, z: 200 } },
})

world.createText({
  attribute: { text: '2.5D <style fontSize="30" borderWidth="2">Parallax</style> Engine' },
  style: { color: '#c77dff', opacity: 0.8, fontSize: 22, fontFamily: 'Segoe UI, sans-serif', borderWidth: 1, borderColor: 'rgb(255, 255, 255)', textAlign: 'center' },
  transform: { position: { x: -100, y: 60, z: 200 } },
})

window.addEventListener('mousemove', (e) => {
  if (!world.camera) return
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  world.camera.transform.position.x = (e.clientX - cx) * 0.12
  world.camera.transform.position.y = (e.clientY - cy) * 0.12
})

window.addEventListener('wheel', (e) => {
  if (!world.camera) return
  world.camera.animate({
    transform: {
      position: {
        z: Math.min(
          Math.max(world.camera.transform.position.z + e.deltaY, -200),
          200
        )
      }
    }
  }, 100, 'easeOut')
}, { passive: true })

world.start()

console.log(world)
