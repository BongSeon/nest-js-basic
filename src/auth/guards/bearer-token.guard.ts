import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { TokenBlacklistService } from '../services/token-blacklist.service'
import { AuthService } from '../auth.service'
import { UsersService } from '../../users/users.service'

@Injectable()
export class BearerTokenGuard implements CanActivate {
  constructor(
    private tokenBlacklistService: TokenBlacklistService,
    private authService: AuthService,
    private userService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    const token = this.authService.extractTokenFromHeader(request, 'Bearer')

    if (!token) {
      throw new UnauthorizedException('Token not found in Authorization header')
    }

    const result = await this.authService.verifyToken(token)

    // 블랙리스트 확인
    if (this.tokenBlacklistService.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked')
    }

    const user = await this.userService.findOne(result.sub)

    request.token = token
    request.tokenType = result.type
    request.user = user

    return true
  }
}

@Injectable()
export class AccessTokenGuard extends BearerTokenGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context)

    const request = context.switchToHttp().getRequest()

    if (request.tokenType !== 'access') {
      throw new UnauthorizedException('Token is not an access token')
    }

    return true
  }
}

@Injectable()
export class RefreshTokenGuard extends BearerTokenGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context)

    const request = context.switchToHttp().getRequest()

    if (request.tokenType !== 'refresh') {
      throw new UnauthorizedException('Token is not a refresh token')
    }

    return true
  }
}
