import { World } from '../../src/index.js'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const world = new World(canvas)
world.start()

world.camera = world.createCamera()

// 테스트 용 객체 1: 일반 학생
world.createRectangle({
  attribute: { className: 'student' },
  dataset: { name: 'alice', hp: 50 },
  transform: { position: { x: -200, y: 100 } },
  style: { width: 100, height: 100, color: '#444' }
})

// 테스트 용 객체 2: HP가 100인 여학생
world.createRectangle({
  attribute: { className: 'student' },
  dataset: { name: 'girl', hp: 100 },
  transform: { position: { x: 0, y: 100 } },
  style: { width: 100, height: 100, color: '#444' }
})

// 테스트 용 객체 3: 여학생이면서 리더
const student = world.createRectangle({
  attribute: { className: 'student leader' },
  dataset: { name: 'girl', hp: 200 },
  transform: { position: { x: 200, y: 100 } },
  style: { width: 100, height: 100, color: '#444' }
})

// 배경 안내 텍스트
world.createText({
  attribute: { text: `1초 뒤 조건에 맞는 객체의 색상이 바뀝니다.\n.student (전체 파란 테두리)\n.student[data-hp=100] (빨간색 면)\n.student.leader[attr-id='${student.attribute.id}'] (초록색 면)` },
  transform: { position: { x: 0, y: -200 } },
  style: { fontSize: 16, color: '#fff', textAlign: 'center', lineHeight: 1.5 }
})

setTimeout(() => {
  // 1. .student 모두 파란 테두리 추가
  world.select('.student').forEach(o => {
    o.style.borderWidth = 4
    o.style.borderColor = '#00aaff'
  })

  // 2. .student[data-hp=100] 찾아서 색 변경
  world.select('.student[data-hp=100]').forEach(o => {
    o.style.color = '#ff4444'
  })

  // 3. .student.leader[attribute-id="xxx"] 찾아서 색 변경
  world.select(`.student.leader[attr-id="${student.attribute.id}"]`).forEach(o => {
    o.style.color = '#44ff44'
  })
}, 1000)
