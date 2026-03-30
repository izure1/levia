/**
 * 에셋 기반 클립을 관리하는 추상 매니저 클래스.
 * SpriteManager, VideoManager 등이 이를 상속합니다.
 */
export abstract class AssetManager<TClipOptions extends { name: string }, TClip> {
  protected clips: Map<string, TClip> = new Map()

  /**
   * 클립을 등록합니다.
   */
  abstract create(options: TClipOptions): this

  /**
   * 이름으로 클립을 조회합니다.
   */
  get(name: string): TClip | undefined {
    return this.clips.get(name)
  }
}
