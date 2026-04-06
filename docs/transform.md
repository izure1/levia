# Transform (변환) 가이드

안녕하세요! **Transform**은 객체가 월드 상의 **어디에, 어떤 방향으로, 어떤 크기로** 놓일지를 결정하는 가장 중요한 물리적 배치 정보입니다. 레비아 엔진은 "부모-자식(Parent-Child)" 계층 구조를 지원하여, 복잡한 3D 변환을 직관적으로 관리할 수 있도록 돕습니다.

---

## 📍 1. 변환 요소 (Components)

모든 객체는 `transform` 속성 아래에 다음과 같은 데이터를 가집니다.

| 속성 | 타입 / 단위 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `position` | `{x, y, z}` (px) | `0, 0, 0` | 객체의 중심 위치. Z축은 카메라와의 거리를 의미함. |
| `rotation` | `{x, y, z}` (도) | `0, 0, 0` | 객체의 각 축 기준 회전 각도. 적용 순서: Z -> Y -> X. |
| `scale` | `{x, y, z}` (배율) | `1, 1, 1` | 객체의 크기 배율. |
| `pivot` | `{x, y}` (0~1.0) | `0.5, 0.5` | 변환의 기준점 (0,0: 좌상단, 1,1: 우하단). |

---

## ⛓️ 2. 계층 구조와 상속 (Hierarchy)

레비아 엔진은 객체 간의 부모-자식 관계를 통해 복잡한 움직임을 단순화합니다.

| 메서드 | 파라미터 | 설명 |
| :--- | :--- | :--- |
| `addChild` | `child: LeviarObject` | 자식을 등록하며 부모의 모든 변환 정보를 상속받음. |
| **Matrix World** | - | 부모와 자신의 로컬 변환을 곱하여 최종 좌표를 자동 계산함. |

---

## 👣 3. 추적 시스템 (Following System)

자식 관계 외에도, 독립성을 유지하면서 따라다니는 고유 시스템을 제공합니다.

| 메서드 | 파라미터 | 설명 |
| :--- | :--- | :--- |
| `follow` | `target, offset?` | 타겟의 **위치(position)**만 실시간 복제. 회전/크기 변화에는 영향받지 않음. |

---

## 💻 사용 예시

### 행성과 위성 만들기 (계층 구조 활용)
```typescript
const planet = world.createCircle({ style: { width: 100, color: '#e67e22' } });
const satellite = world.createCircle({ style: { width: 30, color: '#95a5a6' } });

// 자식으로 등록하면 부모(행성)를 따라 움직입니다.
planet.addChild(satellite);

// 위성을 옆으로 살짝 떼어 놓습니다.
satellite.transform.position.x = 150;

// 행성을 회전시키면 위성이 행성 주위를 공전합니다!
planet.animate({
  transform: { rotation: { z: '+=360' } }
}, 5000, 'linear');
```

