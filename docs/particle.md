## 파티클 객체

파티클 객체는 파티클을 생성하는 객체입니다. 다음과 같이 사용합니다.

```typescript
import { World } from 'lve4'

const world = new World()

await world.loader.loadAssets({
  'particle': './asset/image/particle.png',
})

world.particleManager.create({
  name: 'flame',
  src: 'particle',
  loop: true,
  lifespan: 1000,
  interval: 1000,
  rate: 10,
})

const particle = world.createParticle({
  attribute: {
    name: 'particle-object',
  },
  style: {
    width: 100,
    height: 100,
  },
})

particle.play('flame')
```

lifespan은 파티클이 생성되고 소멸될 때까지의 시간입니다.
rate는 한번에 생성되는 파티클의 개수입니다.
interval은 파티클이 생성되고 나서 소멸될 때까지의 시간입니다.

예를 들어, lifespan 3000, rate 10, interval 1000이라면, 한번에 10개의 파티클이 생성되고, 1초뒤에 또 10개의 파티클이 생성되며 반복됩니다. 그리고 각 파티클은 3초 동안 유지됩니다.

파티클은 물리엔진의 영향을 받습니다. 생성 후, 랜덤한 방향으로 힘을 받아 날아가다가, 일정시간 후 소멸됩니다. 소멸은 서서히 작아지면서 사라집니다.

파티클의 style.width, style.height 이미지 크기가 지정되지 않으면, 이미지의 원본 크기를 사용합니다.
파티클은 style.blendMode의 영향을 받습니다. 기본값은 'lighter' 입니다.
파티클은 attribute의 물리엔진 요소, density, restitution, friction, fixedRotation, gravityScale, collisionGroup, collisionMask, collisionCategory 등의 영향을 받습니다.


```typescript
import { World } from 'lve4'

const world = new World()

await world.loader.loadAssets({
  'particle': './asset/image/particle.png',
})

world.particleManager.create({
  name: 'flame',
  src: 'particle',
  loop: true,
  lifespan: 1000,
  interval: 1000,
  rate: 10,
})

const particle = world.createParticle({
  attribute: {
    name: 'particle-object',
  },
  style: {
    width: 30,
    height: 30,
    blendMode: 'lighter',
  },
})

particle.play('flame')
```
