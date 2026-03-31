import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

// 마우스 드래그 및 휠로 카메라 이동 가능 설정 (입체감 확인)
window.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  camera.transform.position.x = (e.clientX - cx) * 0.1
  camera.transform.position.y = -(e.clientY - cy) * 0.1
})
window.addEventListener('wheel', (e) => {
  camera.transform.position.z += e.deltaY
}, { passive: true })


// 1. 태양 (최상위 부모)
const sun = world.createEllipse({
  style: { color: '#ffcc00', width: 100, height: 100, shadowColor: '#ffcc00', shadowBlur: 30 },
  transform: { position: { x: 0, y: 0, z: 0 } }
}).addChild(
  world.createText({
    attribute: { text: 'Sun' },
    style: { color: '#000', fontSize: 20, fontWeight: 'bold' },
    transform: { position: { x: 0, y: 0, z: 0 } }
  })
)

// 2. 지구 (태양의 자식)
const earth = world.createEllipse({
  style: { color: '#0077ff', width: 40, height: 40 },
  // 태양으로부터 x축으로 200만큼 떨어져 있습니다.
  transform: { position: { x: 200, y: 0, z: 0 } }
})
sun.addChild(earth) // 지구를 태양에 종속

// 3. 달 (지구의 자식 - 자식에 자식을 넣기!)
const moon = world.createEllipse({
  style: { color: '#dddddd', width: 15, height: 15 },
  // 지구로부터 x축으로 60만큼 떨어져 있습니다.
  transform: { position: { x: 60, y: 0, z: 0 } }
})
earth.addChild(moon) // 달을 지구에 종속


world.on('update', () => {
  // 태양 제자리 자전 (지구가 태양 주위를 돌게 됨)
  sun.transform.rotation.z += 1

  // 지구 제자리 자전 (달이 지구 주위를 돌게 됨)
  // 지구의 자전 속도가 태양보다 빠르게 설정
  earth.transform.rotation.z += 3

  // 3D 효과를 위해 태양계를 살짝 기울입니다 (x, y축 회전)
  sun.transform.rotation.x = 45
  // sun.transform.rotation.y += 0.5
})
world.start()
