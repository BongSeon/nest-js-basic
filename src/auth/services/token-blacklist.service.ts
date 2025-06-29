import { Injectable } from '@nestjs/common'

@Injectable()
export class TokenBlacklistService {
  private blacklistedTokens: Set<string> = new Set()

  /**
   * 토큰을 블랙리스트에 추가
   */
  addToBlacklist(token: string): void {
    this.blacklistedTokens.add(token)
  }

  /**
   * 토큰이 블랙리스트에 있는지 확인
   */
  isBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token)
  }

  /**
   * 블랙리스트에서 토큰 제거 (선택적)
   */
  removeFromBlacklist(token: string): void {
    this.blacklistedTokens.delete(token)
  }

  /**
   * 블랙리스트 크기 반환 (디버깅용)
   */
  getBlacklistSize(): number {
    return this.blacklistedTokens.size
  }
}
