# Method (메서드) 가이드

안녕하세요! **Method**는 객체가 수행할 수 있는 **구체적인 행동**입니다. 레비아 엔진은 개발자가 코드를 통해 객체를 정밀하게 제어할 수 있도록 강력하고 직관적인 메서드들을 제공합니다.

---

## 📋 1. 객체 공용 메서드 (Common Methods)
모든 객체(`LeviarObject`)가 공통적으로 사용할 수 있는 핵심 기능들입니다.

### ✨ 상태 및 시각 효과

#### `animate(target, duration, easing)`
객체의 속성을 목표값까지 부드럽게 변화시킵니다.

| 파라미터 | 타입 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `target` | `AnimateTarget` | - | 변경할 속성(style, transform, dataset)과 목표값입니다. `+=`, `-=` 사용 가능. |
| `duration` | `number` | - | 애니메이션 지속 시간 (ms) |
| `easing` | `EasingType` | `'linear'` | 가속도 조절 함수 이름 |

- **반환값**: 제어 가능한 `Animation` 객체

#### `fadeIn(durationMs, easing)`
객체를 투명도 0에서 1로 서서히 나타나게 합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `durationMs` | `number` | - | 애니메이션 지속 시간 (ms) |
| `easing` | `EasingType` | - | 가속도 조절 함수 이름 |

- **작동 방식**: 호출 즉시 `style.display`를 `'block'`으로 설정 후 투명도 애니메이션 시작.
- **반환값**: `FadeTransition` 객체

#### `fadeOut(durationMs, easing)`
객체를 투명도 1에서 0으로 서서히 사라지게 합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `durationMs` | `number` | - | 애니메이션 지속 시간 (ms) |
| `easing` | `EasingType` | - | 가속도 조절 함수 이름 |

- **작동 방식**: 완료 후 `style.display`를 `'none'`으로 전환하며 물리 계산에서 제외.
- **반환값**: `FadeTransition` 객체

#### `remove(options)`
객체를 월드와 메모리에서 안전하게 제거합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `options.child` | `boolean` | `false` | `true` 시 모든 자식 객체도 함께 제거 |
| `options.follower` | `boolean` | `false` | `true` 시 나를 따라다니는 객체(`follow`)들도 제거 |

- **반환값**: `this` (메서드 체이닝 지원)

### 🏷️ 클래스 및 상태 확인

#### `hasClass(classNames)` / `addClass(classNames)` / `removeClass(classNames)`
객체의 클래스 목록을 관리합니다.

| 메서드 | 파라미터 | 반환값 | 설명 |
| :--- | :--- | :--- | :--- |
| `hasClass` | `string` | `boolean` | 특정 클래스 포함 여부 확인 (공백 구분 다중 체크 가능) |
| `addClass` | `string` | `this` | 클래스 추가 (중복 시 추가되지 않음) |
| `removeClass` | `string` | `this` | 클래스 제거 |

### ⛓️ 계층 구조 (Hierarchy)

#### `addChild(child)` / `removeChild(child)` / `removeFromParent()`
객체 간의 부모-자식 관계를 관리합니다.

| 메서드 | 파라미터 | 반환값 | 설명 |
| :--- | :--- | :--- | :--- |
| `addChild` | `LeviarObject` | `this` | 자식으로 추가. 부모의 변환(Matrix)을 상속받음. |
| `removeChild` | `LeviarObject` | `this` | 지정한 자식 객체 해제. |
| `removeFromParent`| - | `this` | 현재 부모로부터 독립. |

### 👣 추적 (Following)

#### `follow(target, offset)`
다른 객체를 일정 거리를 두고 실시간으로 따라다니게 합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `target` | `LeviarObject` | - | 따라다닐 대상 객체 |
| `offset` | `{x?, y?, z?}` | - | 대상과의 간격 좌표 |

- **반환값**: `this`

#### `unfollow()` / `kick(follower)`
추적 관계를 해제합니다.

| 메서드 | 파라미터 | 반환값 | 설명 |
| :--- | :--- | :--- | :--- |
| `unfollow` | - | `this` | 현재 대상을 따라가는 동작 중단. |
| `kick` | `LeviarObject` | `this` | 나를 따라다니는 특정 객체와의 연결 해제. |

- **Getter**: `following` (내가 따라가는 대상), `followers` (나를 따라오는 목록)

### ⚖️ 물리 엔진 제어 (Physics)
*이 메서드들은 `attribute.physics`가 설정된 객체에서만 유효합니다.*

| 메서드 | 파라미터 | 설명 |
| :--- | :--- | :--- |
| `applyForce` | `force: {x?, y?}` | 객체 중심에 특정 방향으로 힘을 가함. |
| `setVelocity` | `velocity: {x?, y?}` | 무시하고 즉시 새로운 속도로 설정. |
| `setAngularVelocity` | `angularVelocity: number` | 회전 속도(라디안/초) 설정. |
| `applyTorque` | `torque: number` | 회전하는 힘(토크)을 가함. |

---

## 📋 2. 객체별 고유 메서드 (Specific Methods)

### 📸 Camera 전용

| 메서드 | 파라미터 | 반환값 | 설명 |
| :--- | :--- | :--- | :--- |
| `canvasToWorld` | `x, y, targetZ?` | `{x, y, z}` | 화면 픽셀 좌표를 월드 좌표로 변환. |
| `canvasToLocal` | `x, y, targetZ?` | `{x, y, z}` | 화면 좌표를 카메라 로컬 좌표계로 변환. |
| `calcDepthRatio` | `targetZ, value` | `number` | 특정 심도에서 특정 픽셀 크기로 보이기 위한 객체 크기 계산. |

### 🎬 재생 제어 (Video / Sprite / Particle)

| 메서드 | 반환값 | 설명 |
| :--- | :--- | :--- |
| `play()` | `this` | 재생 시작 또는 일시정지 해제. |
| `pause()` | `this` | 재생 일시정지. |
| `stop()` | `this` | 재생 정지 및 초기화 (Video/Sprite는 처음으로, Particle은 생성 중단). |

---

## 📋 3. 월드 메서드 (World Methods)

| 메서드 | 파라미터 | 설명 |
| :--- | :--- | :--- |
| `create[Type]` | `options?` | `Image`, `Video`, `Rectangle` 등 신규 객체 생성 및 등록. |
| `select` | `selector` | CSS 선택자 기반 복합 검색. (`.class`, `[attr-key=value]`, `[data-key=value]`) |
| `start()` / `stop()` | - | 월드 렌더링 및 물리 시뮬레이션 시작/중단. |

