import { LveObject } from '../LveObject.js'
import type { World } from '../World.js'
import type { LveObjectOptions } from '../types.js'

export interface CameraAttribute {
  /**
   * 카메라의 원근 투영 초점 거리.
   * 카메라와 오브젝트 사이의 transform.position.z의 차이가 focalLength일때 1:1 스케일로 렌더링됩니다.
   * @default 100
   */
  focalLength?: number
}

export class Camera<
  D extends Record<string, any> = Record<string, any>
> extends LveObject<CameraAttribute, D> {
  /** @internal */
  _world?: World;

  constructor(options?: LveObjectOptions<CameraAttribute, D>) {
    super('camera', options)
    if (this.attribute.focalLength === undefined) {
      this.attribute.focalLength = 100
    }
  }

  /**
   * 캔버스의 x, y 좌표(0 ~ width, 0 ~ height)를 카메라 기준의 월드 좌표로 변환합니다.
   * @param x 캔버스 좌측 상단을 0으로 하는 x 좌표
   * @param y 캔버스 좌측 상단을 0으로 하는 y 좌표
   * @param targetZ (선택) 투영하고자 하는 월드 공간의 Z 좌표. 지정하지 않으면 카메라의 fov가 1:1이 되는 심도(camZ + focalLength)로 계산됩니다.
   */
  canvasToWorld(x: number, y: number, targetZ?: number): { x: number; y: number; z: number } {
    const w = this._world?.['_canvas']?.width ?? window.innerWidth
    const h = this._world?.['_canvas']?.height ?? window.innerHeight

    const screenX = x - w / 2
    const screenY = -(y - h / 2)

    const camX = this.transform.position.x
    const camY = this.transform.position.y
    const camZ = this.transform.position.z

    const rotX = this.transform.rotation.x || 0
    const rotY = this.transform.rotation.y || 0
    const rotZ = this.transform.rotation.z || 0

    const focalLength = this.attribute.focalLength ?? 100
    const tZ = targetZ ?? (camZ + focalLength)
    const targetDepth = tZ - camZ

    const scale = targetDepth / focalLength
    let dx = screenX * scale
    let dy = screenY * scale
    let dz = targetDepth

    const radZ = rotZ * Math.PI / 180
    const radX = rotX * Math.PI / 180
    const radY = rotY * Math.PI / 180

    if (radZ !== 0) {
      const c = Math.cos(radZ), s = Math.sin(radZ)
      const nx = dx * c - dy * s
      const ny = dx * s + dy * c
      dx = nx; dy = ny
    }
    if (radX !== 0) {
      const c = Math.cos(radX), s = Math.sin(radX)
      const ny = dy * c - dz * s
      const nz = dy * s + dz * c
      dy = ny; dz = nz
    }
    if (radY !== 0) {
      const c = Math.cos(radY), s = Math.sin(radY)
      const nx = dx * c + dz * s
      const nz = -dx * s + dz * c
      dx = nx; dz = nz
    }

    return {
      x: camX + dx,
      y: camY + dy,
      z: camZ + dz
    }
  }

  /**
   * 캔버스의 x, y 좌표를 카메라 기준의 로컬 좌표계로 변환합니다.
   * 결과값은 카메라 내부의 자식(child)으로 배치할 때의 좌표입니다.
   * @param x 캔버스 좌측 상단을 0으로 하는 x 좌표
   * @param y 캔버스 좌측 상단을 0으로 하는 y 좌표
   * @param targetZ (선택) 투영하고자 하는 월드 공간의 Z 좌표
   */
  canvasToLocal(x: number, y: number, targetZ?: number): { x: number; y: number; z: number } {
    const w = this._world?.['_canvas']?.width ?? window.innerWidth
    const h = this._world?.['_canvas']?.height ?? window.innerHeight

    const screenX = x - w / 2
    const screenY = -(y - h / 2)

    const camZ = this.transform.position.z

    const focalLength = this.attribute.focalLength ?? 100
    const tZ = targetZ ?? (camZ + focalLength)
    const targetDepth = tZ - camZ

    const scale = targetDepth / focalLength
    let dx = screenX * scale
    let dy = screenY * scale

    return {
      x: dx,
      y: dy,
      z: targetDepth
    }
  }

  /**
   * targetZ 깊이에 있는 대상이 화면에서 value 크기만큼 보이려면
   * 실제 크기가 얼마가 되어야 하는지 원근 비율을 수학적으로 계산해 반환합니다.
   * @param targetZ 목표 Z 좌표
   * @param value 기준 크기 (화면에 보여질 목표 크기)
   */
  calcDepthRatio(targetZ: number, value: number): number {
    const depth = targetZ - this.transform.position.z
    const focalLength = this.attribute.focalLength ?? 100
    const scale = depth === 0 ? 1 : focalLength / depth

    if (scale === 0) return value
    return value / scale
  }
}
