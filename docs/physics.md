내부적으로 `matter-js`를 사용합니다. 따라서 `matter-js`의 API를 사용할 수 있습니다.

```typescript
const rect = world.createRectangle({
  attribute: {
    name: 'my-rectangle',
    class: 'physics-object',
    physics: 'dynamic',
  }
})

const ellipse = world.createEllipse({
  attribute: {
    name: 'my-ellipse',
    class: 'physics-object',
    physics: 'dynamic',
  }
})

// 언제나 유동적으로 변경 가능
rect.attribute.physics = 'static'

// 선택자를 통해 객체를 선택할 수 있습니다. 쿼리 방식은 html의 querySelector과 같습니다.
// 현재 className 기반으로 선택하였습니다.
const objects = world.select('.physics-object')

// 선택된 객체들에게 물리 효과를 적용할 수 있습니다.
objects.forEach((object) => {
  object.applyForce({
    x: 10,
    y: 10,
  })
})

// 또는 각 객체에 직접 접근하여 물리 효과를 적용할 수 있습니다.
rect.applyForce({
  x: 10,
  y: 10,
})
```

## 월드에 물리 적용

```typescript
import { World } from 'lve4'

const world = new World()

world.setGravity({
  x: 0,
  y: -9.8,
})

// 충돌체 설정 구현
world.setCollisionFilter({
  group: 1,
  mask: -1,
  category: 1,
})

const rect = world.createRectangle({
  attribute: {
    name: 'my-rectangle',
    class: 'physics-object',
    physics: 'dynamic',
  }
})

rect.setCollisionFilter({
  group: 1,
  mask: -1,
  category: 1,
})
```
