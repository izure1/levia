/**
 * 속성 변경 시 어떤 dirty 플래그를 세울지 정의하는 룩업 테이블.
 *
 * 'texture' — Offscreen Canvas · 텍스처 재생성이 필요한 속성
 * 'physics' — 물리 바디 크기 재계산이 필요한 속성
 */

export type DirtyKind = 'texture' | 'physics'

// ─── style 속성 ──────────────────────────────────────────────────────────────

export const STYLE_DIRTY_MAP: Readonly<Record<string, DirtyKind[]>> = {
  // 텍스처만 재생성
  color: ['texture'],
  textAlign: ['texture'],
  shadowColor: ['texture'],
  shadowBlur: ['texture'],
  shadowOffsetX: ['texture'],
  shadowOffsetY: ['texture'],
  // 텍스처 + 물리 바디 재계산
  fontSize: ['texture', 'physics'],
  fontFamily: ['texture', 'physics'],
  fontWeight: ['texture', 'physics'],
  fontStyle: ['texture', 'physics'],
  lineHeight: ['texture', 'physics'],
  letterSpacing: ['texture', 'physics'],
  width: ['texture', 'physics'],
  height: ['texture', 'physics'],
  borderWidth: ['texture', 'physics'],
  // 물리 바디만 재계산
  margin: ['physics'],
}

// ─── attribute 속성 ──────────────────────────────────────────────────────────

export const ATTR_DIRTY_MAP: Readonly<Record<string, DirtyKind[]>> = {
  text: ['texture', 'physics'],
  src: ['texture', 'physics'],
  // 물리 바디 파라미터
  physics: ['physics'],
  density: ['physics'],
  friction: ['physics'],
  restitution: ['physics'],
  fixedRotation: ['physics'],
  gravityScale: ['physics'],
  collisionGroup: ['physics'],
  collisionMask: ['physics'],
  collisionCategory: ['physics'],
}

// ─── transform.scale 속성 ────────────────────────────────────────────────────

export const SCALE_DIRTY_MAP: Readonly<Record<string, DirtyKind[]>> = {
  x: ['physics'],
  y: ['physics'],
}

// ─── 쓰로틀 + 디바운스 상수 ──────────────────────────────────────────────────

/**
 * 텍스처 업데이트 최대 간격 (프레임 수) — 스로틀.
 * 변경이 매 프레임 와도 이 프레임 수마다 1회만 업데이트합니다.
 */
export const TEXTURE_THROTTLE_FRAMES = 8

/**
 * 텍스처 디바운스 대기 (프레임 수).
 * 마지막 변경 이후 이 프레임 수 동안 추가 변경이 없으면 "마무리" 업데이트를 실행합니다.
 */
export const TEXTURE_DEBOUNCE_FRAMES = 2

/**
 * 물리 바디 크기 최대 재확인 간격 (프레임 수) — 스로틀.
 */
export const PHYSICS_THROTTLE_FRAMES = 6

/**
 * 물리 바디 디바운스 대기 (프레임 수).
 */
export const PHYSICS_DEBOUNCE_FRAMES = 2

