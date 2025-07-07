import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { TokenBlacklistService } from '../services/token-blacklist.service'
import { AuthService } from '../auth.service'
import { JwtPayload } from '../types/jwt-payload.interface'

@Injectable()
export class BearerTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
    private authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    const token = this.authService.extractTokenFromHeader(request, 'Bearer')

    if (!token) {
      throw new UnauthorizedException('Token not found in Authorization header')
    }

    // 블랙리스트 확인
    if (this.tokenBlacklistService.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked')
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET || 'jwt-secret',
      })

      // 요청 객체에 사용자 정보를 추가
      request.token = token
      request.tokenType = payload.type
      request.user = payload

      return true
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired')
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token format')
      } else {
        throw new UnauthorizedException('Invalid token')
      }
    }
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
