# Event (이벤트) 가이드

안녕하세요! **Event**는 월드 안에서 일어나는 **다양한 사건**들을 알려주는 신호등입니다. 레비아 엔진은 객체의 상태 변화나 사용자 상호작용을 실시간으로 감지할 수 있도록 풍부한 이벤트를 제공합니다.

---

## 📋 1. 객체 공용 이벤트 (LeviarObject Events)

모든 객체(`LeviarObject`)에서 발생하는 공통 신호입니다. `obj.on('이벤트명', (arg1, arg2...) => { ... })` 형식을 통해 구독할 수 있습니다.

### 🖱️ 마우스 상호작용 (MouseEvents)

| 이벤트 명 | 인자(Arguments) | 시점 |
| :--- | :--- | :--- |
| `click` | `e: MouseEvent` | 객체를 클릭했을 때 |
| `dblclick` | `e: MouseEvent` | 객체를 더블 클릭했을 때 |
| `mousedown` / `mouseup` | `e: MouseEvent` | 마우스 버튼을 누르거나 뗄 때 |
| `mouseover` / `mouseout` | `e: MouseEvent` | 마우스가 객체 영역에 진입/이탈 시 |
| `mousemove` | `e: MouseEvent` | 객체 위에서 마우스가 움직일 때 |
| `contextmenu` | `e: MouseEvent` | 객체 위에서 우측 클릭 시 |

### ⚙️ 상태 및 속성 변경 (Modified)

| 이벤트 명 | 인자(Arguments) | 시점 |
| :--- | :--- | :--- |
| `cssmodified` | `key, newValue, oldValue` | 스타일(`style`) 속성 변경 시 |
| `attrmodified` | `key, newValue, oldValue` | 기본 속성(`attribute`) 변경 시 |
| `datamodified` | `key, newValue, oldValue` | 사용자 데이터(`dataset`) 변경 시 |
| `positionmodified` | `axis, newValue, oldValue` | 위치(x, y, z) 변경 시 |
| `rotationmodified` | `axis, newValue, oldValue` | 회전(x, y, z) 변경 시 |
| `scalemodified` | `axis, newValue, oldValue` | 크기(x, y, z) 변경 시 |
| `pivotmodified` | `axis, newValue, oldValue` | 변환 중심점(Pivot) 변경 시 |

### 🎬 재생 관련 (Playback)

| 이벤트 명 | 시점 | 비고 |
| :--- | :--- | :--- |
| `play` | 재생이 시작되거나 재개될 때 | - |
| `pause` | 재생이 일시 정지될 때 | - |
| `ended` | 재생이 끝까지 도달했을 때 | - |
| `repeat` | 반복 재생 시 한 사이클 완료 시 | - |

---

## 📋 2. 애니메이션 및 트랜지션 (Animation & Transition)

| 이벤트 명 | 시점 | 주요 동작 |
| :--- | :--- | :--- |
| `start` | 효과 시작 시 | `fadeIn` 시 `display: block` 처리 등 |
| `update` | 매 프레임 수치 변화 시 | `state` 진행 정보 전달 |
| `end` | 효과 완료 시 | `fadeOut` 시 `display: none` 처리 등 |
| `pause` / `resume` | 일시 중지 / 재개 시 | - |
| `stop` | 강제 중단 시 | `anim.stop()` 호출 시 |

---

## 📋 3. 월드 이벤트 (World Events)

| 이벤트 명 | 인자(Arguments) | 시점 |
| :--- | :--- | :--- |
| `update` | `timestamp: number` | 월드 심장 박동(매 프레임) |
| `click` / `mousedown` / ...| `obj: LeviarObject, e: MouseEvent` | 월드 전체 마우스 이벤트 |

---

## 💡 이벤트 전파 제어 (Bubbling)

레비아 엔진의 이벤트 시스템은 객체에서 발생한 이벤트가 월드로 전파되는 구조를 가집니다.

```typescript
const box = world.createRectangle({ attribute: { name: 'myBox' } });

box.on('click', (e) => {
  // 나만 이벤트를 처리하고, world.on('click', ...) 까지 가지 않게 막으려면:
  e.stopPropagation();
});
```
이렇게 전파를 막으면 이미 클릭된 객체 상위의 다른 객체나 월드 전체 핸들러가 동시에 작동하는 것을 방지할 수 있습니다.

