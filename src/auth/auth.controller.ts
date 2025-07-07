import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { BasicTokenGuard } from './guards/basic-token.guard'
import {
  AccessTokenGuard,
  RefreshTokenGuard,
} from './guards/bearer-token.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.registerWithEmail(registerDto)
  }

  @Post('login')
  @UseGuards(BasicTokenGuard)
  async login(@Req() request: Request) {
    const { username, password } = request['credentials']
    return await this.authService.loginWithUsername({ username, password })
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  async logout(@Req() request: Request) {
    // Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Bearer token not found in Authorization header'
      )
    }

    const token = authHeader.substring(7) // 'Bearer ' 제거

    // 토큰을 블랙리스트에 추가하여 로그아웃 처리
    return await this.authService.logout(token)
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto.refreshToken)
  }

  @Post('hello')
  @UseGuards(AccessTokenGuard)
  async hello(@Req() request: Request) {
    // Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Bearer token not found in Authorization header'
      )
    }

    const token = authHeader.substring(7) // 'Bearer ' 제거

    // 토큰으로부터 유저 정보 가져오기
    const user = await this.authService.getUserFromToken(token)

    // JSON 형태로 유저 정보 반환 (비밀번호 제외)
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
