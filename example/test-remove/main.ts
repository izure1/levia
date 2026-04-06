import { World } from '../../src/index.js'

const world = new World({ disableContextMenu: true })
const camera = world.createCamera()

world.camera = camera

// 바닥 역할을 할 정적 물리 객체
const ground = world.createRectangle({
  attribute: { physics: 'static' },
  style: { width: 800, height: 50, color: '#444444' },
  transform: { position: { x: 0, y: -300, z: 0 } }
})

// 캔버스(월드) 좌클릭 시 물리 큐브 생성
world.on('click', (obj, e: MouseEvent) => {
  // 이미 클릭된 객체가 큐브이거나 바닥일 경우 무시
  if (obj) return

  // 클릭한 화면 좌표를 월드 좌표로 변환
  const targetDepth = 0
  const pos = camera.canvasToWorld(e.clientX, e.clientY, targetDepth)

  // 동적 객체 생성
  const box = world.createRectangle({
    attribute: { physics: 'dynamic' },
    style: { width: 50, height: 50, color: `hsl(${Math.random() * 360}, 80%, 60%)`, borderWidth: 2, borderColor: '#fff' },
    transform: { position: { x: pos.x, y: pos.y, z: targetDepth }, rotation: { z: Math.random() * 360 } }
  })
    .addChild(world.createText({
      attribute: { text: 'Delete to\nRight Click' },
      style: { color: '#fff', fontSize: 11, fontFamily: 'sans-serif, monospace', textAlign: 'center', borderWidth: 1, borderColor: '#000' },
      transform: { position: { x: 0, y: 0, z: 0 } },
    }))

  // 생성된 큐브에 우클릭 시 삭제 이벤트 등록
  box.on('contextmenu', (eBox) => {
    // 이벤트가 월드 클릭 등으로 전파되지 않게 막음
    eBox.stopImmediatePropagation()

    // LeviarObject에서 완전히 삭제 (물리 엔진 바디 동시 제거)
    box.remove({ child: true })
    console.log('Object removed')
  })
})

world.start()
