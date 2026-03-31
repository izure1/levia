import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

// 1. 메인 기준 객체 (부모)
const parentBox = world.createRectangle({
  style: { color: '#ff5e5b', width: 100, height: 100 },
  transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
})

// 부모 객체의 복합 애니메이션 이동, 스케일링, 회전 루프
function stage1() {
  parentBox.animate({
    transform: { position: { x: 200 }, rotation: { z: 180 }, scale: { x: 1.5, y: 1.5 } }
  }, 2000, 'easeInOut').on('end', stage2)
}
function stage2() {
  parentBox.animate({
    transform: { position: { x: -200 }, rotation: { z: 360 }, scale: { x: 0.8, y: 0.8 } }
  }, 2000, 'easeInOut').on('end', stage3)
}
function stage3() {
  parentBox.animate({
    transform: { position: { x: 0 }, rotation: { z: 0 }, scale: { x: 1, y: 1 } }
  }, 2000, 'easeInOut').on('end', stage1)
}
stage1()

// 2. 부모 객체에 들러붙는 자식 1 (원 모양)
const childA = world.createEllipse({
  style: { color: '#00cecb', width: 60, height: 60 },
  transform: { position: { x: 0, y: 80, z: 0 } },
})
// 부모의 트리 자식으로 소속됩니다
parentBox.addChild(childA)

// 3. 부모 객체에 들러붙는 자식 2 (텍스트)
const childB = world.createText({
  attribute: { text: 'Sticked!' },
  style: { color: '#ffed66', fontSize: 24, fontWeight: 'bold' },
  // 부모 공간(로컬)의 좌표 기준
  transform: { position: { x: 100, y: 0, z: 0 }, rotation: { z: -45 } }
})
parentBox.addChild(childB)

// 4. 자식의 자식 (손자의 종속 확인)
const grandChild = world.createEllipse({
  style: { color: '#c77dff', width: 20, height: 20 },
  transform: { position: { x: 0, y: 50, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1 } }
})
childA.addChild(grandChild)

// 5. 클릭 시 X축 360도 회전 테스트 (3D 공전 궤도 확인용)
const instructionText = world.createText({
  attribute: { text: '중앙의 붉은 박스를 클릭하여 X축 360도 3D 회전을 테스트해보세요!' },
  style: { color: '#ffffff', fontSize: 18, zIndex: 10 },
  transform: { position: { x: 0, y: -200, z: 0 } },
})

parentBox.on('click', () => {
  // 복합 대입 연산자를 통해 클릭할 때마다 현재 x 회전값에 360도를 누적하여 돌게 합니다.
  parentBox.animate({ transform: { rotation: { x: '+=360' } } }, 1500, 'easeInOut')
})

world.start()
