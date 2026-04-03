# levia

반갑습니다! **levia**는 WebGL 기술을 활용해 놀라운 시각적 효과를 만들어내는 고성능 2.5D 렌더링 엔진입니다. 복잡한 그래픽 지식이 없어도 누구나 입체감 있는 화면과 살아 움직이는 듯한 물리 효과를 손쉽게 구현할 수 있도록 돕습니다.

---

## 🎨 핵심 개념 알아보기

levia의 모든 객체(`LveObject`)는 4가지 핵심 모델을 통해 관리됩니다. 각 모델이 어떤 역할을 하는지 함께 살펴볼까요?

### 1. Attribute (속성)
객체의 **이름표와 물리적 성격**을 정해줍니다.
-  **식별**: `id`, `type`, `name`, `className`
-  **물리**: `physics`, `density`, `friction`, `frictionAir`, `restitution`, `fixedRotation`, `gravityScale`
-  **충돌**: `collisionGroup`, `collisionMask`, `collisionCategory`
-  **[상세 설명](docs/attribute.md)**

### 2. Dataset (데이터셋)
사용자가 직접 정의하는 **똑똑한 데이터 저장소**입니다.
-  객체마다 필요한 고유 정보를 저장하고, 애니메이션(`animate()`)과 연동해 수치가 자연스럽게 변하도록 만들 수 있습니다.
-  **[상세 설명](docs/dataset.md)**

### 3. Style (스타일)
객체의 **매력적인 외형**을 결정합니다.
-  이미 알고 있는 CSS 방식처럼 `color`, `opacity`, `borderRadius`, `boxShadow` 등을 자유롭게 설정해 보세요.
-  **[상세 설명](docs/style.md)**

### 4. Transform (변형)
객체가 **어느 위치에, 어떤 모습으로 놓일지** 결정합니다.
-  3차원 좌표(`position`), 회전(`rotation`), 크기(`scale`) 및 기준점(`pivot`)을 관리합니다.
-  Z축 깊이 조절을 통해 멀리 있는 물체는 작게, 가까이 있는 물체는 크게 보여주는 원근감을 지원합니다.
-  **[상세 설명](docs/transform.md)**

### 5. Method (메서드)
객체가 수행할 수 있는 **구체적인 행동**을 명령합니다.
-  **공용**: `animate`, `follow`, `addChild`, `remove`, `applyForce`
-  **전용**: `canvasToWorld` (Camera), `play` (Video/Sprite)
-  **[상세 설명](docs/method.md)**

### 6. Event (이벤트)
월드 안에서 일어나는 **다양한 사건**을 감지합니다.
-  **사건**: `click`, `mouseover`, `mousedown`, `ended`
-  **변경**: `cssmodified`, `attrmodified`, `datamodified`
-  **[상세 설명](docs/event.md)**

---

## 🚀 강력한 기능들

### 🎥 카메라와 원근감
초점 거리(Focal Length)를 이용해 실제 세상처럼 입체감 있는 월드를 구현합니다.
-  거리에 따른 자동 크기 변화로 깊이감을 느껴보세요.
-  화면 클릭 위치를 실제 월드 좌표로 바꾸는 편리한 기능도 제공합니다.
-  **[상세 설명](docs/camera.md)**

### ⚖️ 물리 시뮬레이션
간단한 설정만으로 현실적인 물리 반응을 추가할 수 있습니다.
-  부딪히고 튕겨 나가는 효과를 코드 한 줄로 만들어 보세요.
-  깊이에 따라 충돌 레이어를 자동으로 나누어주는 똑똑한 시스템이 포함되어 있습니다.
-  **[상세 설명](docs/physics.md)**

### 🏃 애니메이션 엔진
객체의 모든 수치를 부드럽게 변화시켜 생동감을 불어넣습니다.
-  다양한 움직임 효과(Easing)를 골라보세요.
-  나만의 부드러운 전환 효과를 손쉽게 완성할 수 있습니다.
-  **[상세 설명](docs/animation.md)**

---

## 🛠️ 바로 시작하기 (Quick Start)

levia를 사용하는 가장 쉬운 방법을 소개합니다.

```typescript
import { World } from 'levia'

const world = new World()
const camera = world.createCamera()
world.camera = camera

const box = world.createRectangle({
  attribute: {
    name: 'main_box',
    physics: 'dynamic',
    friction: 0.1
  },
  style: {
    color: '#3498db',
    width: 100,
    height: 100,
    borderRadius: 20
  },
  transform: {
    position: { x: 0, y: 0, z: 0 }
  }
})

// 특정 객체를 선택해 멋진 회전 애니메이션을 적용해 보세요!
const selected = world.select('[attr-name="main_box"]')[0]
selected.animate({
  style: { opacity: 0.5 },
  transform: { rotation: { z: '+=360' } }
}, 1000, 'easeInOutQuad')

world.start()
```

---

## 📜 라이선스
MIT License
