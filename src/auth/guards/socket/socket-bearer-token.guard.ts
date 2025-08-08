import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { AuthService } from 'src/auth/auth.service'
import { UsersService } from 'src/users/users.service'

/**
 * 이렇게 가드 방식으로 적용하는 것보다 socket onConnection에서 직접 검증 및 주입하는 것이 더 좋다.
 * 그렇지 않으면 토큰 만료시 해당 토큰을 갱신해 줄 수 없기 때문.
 */
@Injectable()
export class SocketBearerTokenGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket = context.switchToWs().getClient()
    const headers = socket.handshake.headers

    // Bearer <token>
    const rawToken = headers['authorization']
    if (!rawToken) {
      throw new WsException('Authorization header is required')
    }

    const tokenType = 'Bearer'

    const token = rawToken.startsWith(tokenType + ' ')
      ? rawToken.substring(tokenType.length + 1)
      : null

    if (!token) {
      throw new WsException('Invalid token format')
    }

    try {
      const payload: any = await this.authService.verifyToken(token)
      const user = await this.usersService.findOne(payload.sub)
      socket.user = user

      return true
    } catch (error) {
      throw new WsException(`토큰이 유효하지 않습니다. ${error.message}`)
    }
  }
}
