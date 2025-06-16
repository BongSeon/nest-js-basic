import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'

@Injectable()
export class BasicAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException('Basic authentication required')
    }

    // 'Basic ' 제거하고 base64 디코딩
    const base64Credentials = authHeader.substring(6)
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'utf-8'
    )

    // 'username:password' 형식 파싱
    const [username, password] = credentials.split(':')

    if (!username || !password) {
      throw new UnauthorizedException('Invalid credentials format')
    }

    // 요청 객체에 credentials 추가
    request['credentials'] = { username, password }

    return true
  }
}
