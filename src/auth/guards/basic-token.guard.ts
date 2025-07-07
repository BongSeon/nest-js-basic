import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { AuthService } from '../auth.service'

@Injectable()
export class BasicTokenGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const token = this.authService.extractTokenFromHeader(request, 'Basic')

    const { username, password } = this.authService.decodeBasicToken(token)

    // 요청 객체에 credentials 추가
    request['credentials'] = { username, password }

    return true
  }
}
