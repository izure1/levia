import { World, Animation } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()

world.camera = camera

// 1. LeviarObject.animate() 테스트
const text = world.createText({
  attribute: { text: 'Move and Fade' },
  style: { color: '#7ec8e3', zIndex: 1, fontSize: 36, opacity: 0.2, textShadowBlur: 10, textShadowColor: 'red', textShadowOffsetX: 10, textShadowOffsetY: 10 },
  transform: { position: { x: 0, y: 0, z: -100 } },
})

text.animate({
  style: { opacity: 1, fontSize: 48 },
  position: { z: 0 },
}, 2000, 'easeInOut')

// 2. 복합 대입 연산자 테스트
const box = world.createRectangle({
  style: { color: '#c77dff', width: 50, height: 50 },
  transform: { position: { x: -100, y: 50, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
})

box.animate({
  style: { width: '+=150', height: '*=2' },
  transform: { rotation: { z: '+=3.14' }, position: { x: '+=250' } },
}, 1500, 'easeOutElastic')

// 3. 순수 Animation 객체 테스트
world.createText({
  attribute: { text: 'Pure Animation Log' },
  style: { color: '#f4a261', fontSize: 24 },
  transform: { position: { x: -200, y: 200, z: 0 } },
})

const pureAnim = new Animation({
  val: 100,
})

const readout = world.createText({
  attribute: { text: '0' },
  style: { color: '#ffffff', fontSize: 32 },
  transform: { position: { x: 0, y: 200, z: 0 } },
})

pureAnim.start((state) => {
  readout.attribute.text = Math.round(state.val).toString()
}, 3000, 'easeInOutQuart')

// setTimeout(() => {
//   pureAnim.pause()
//   setTimeout(() => pureAnim.resume(), 1000)
// }, 1000)

// 4. 재귀적인 속성 (Dataset) 테스트
const dataItem = world.createText({
  attribute: { text: 'Dataset Animation' },
  dataset: {
    nested: {
      a: 0,
      b: 100
    }
  },
  style: { color: '#2ec4b6', fontSize: 20 },
  transform: { position: { x: 0, y: 300, z: 0 } },
})

dataItem.animate({
  dataset: {
    nested: {
      a: 500,
      b: 0
    }
  }
}, 2000, 'linear')

// 매 프레임 dataset 값을 텍스트로 표시
setInterval(() => {
  dataItem.attribute.text = `Data: a=${Math.round((dataItem.dataset.nested as any).a)}, b=${Math.round((dataItem.dataset.nested as any).b)}`
}, 100)


world.start()
