## 스프라이트 이미지

스프라이트 이미지는 하나의 이미지를 영역으로 분할해 연속된 이미지를 표현하는 방식입니다.

필름과 비슷한 방식입니다.

스프라이트 이미지의 사용방법은 다음과 같습니다.

```typescript
import { World } from 'lve4'

const world = new World()

await world.loader.loadAssets({
  'sprite': './img/sprite.png',
})

world.spriteManager.create({
  name: 'walk-to-left',
  src: 'sprite',
  frameWidth: 100,
  frameHeight: 100,
  frameRate: 10,
  loop: true,
  start: 0,
  end: 10,
})

world.spriteManager.create({
  name: 'walk-to-right',
  src: 'sprite',
  frameWidth: 100,
  frameHeight: 100,
  frameRate: 10,
  loop: true,
  start: 10,
  end: 20,
})

const spriteObject = world.createSprite({
  attribute: {
    name: 'my-sprite',
  },
  style: {
    width: 100,
    height: 100,
  },
})

spriteObject.play('walk-to-left')
```

만일 이미지의 크기가 300 * 400 사이즈이고, 100 * 100 크기의 프레임으로 구성되어 있다면, 12개의 프레임이 존재합니다.

좌측에서 우측으로, 그리고 끝나면 다음줄로 넘어가 순차적으로 프레임이 재생됩니다.

시작 프레임은 0이고, 마지막 프레임은 11입니다.

```typescript
world.spriteManager.create({
  name: 'walk-to-left',
  src: 'sprite',
  frameWidth: 100,
  frameHeight: 100,
  frameRate: 10,
  loop: true,
  start: 0,
  end: 1,
})
```
