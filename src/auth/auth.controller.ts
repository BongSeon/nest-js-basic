import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
  Get,
} from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { BasicTokenGuard } from './guards/basic-token.guard'
import {
  AccessTokenGuard,
  RefreshTokenGuard,
} from './guards/bearer-token.guard'
import { UserPayload } from '../users/types/user-payload.interface'
import { User as UserDecorator } from '../users/decorator/user.decorator'
import { MeDto } from '../users/dto/me.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 1단계 회원가입: 사용자 정보를 받아서 임시 사용자를 생성하고 인증 코드를 생성
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.registerWithEmail(registerDto)
  }

  @Post('register/resend-code')
  async resendVerificationCode(@Body() body: { email?: string }) {
    return await this.authService.resendVerificationCode(body.email)
  }

  /**
   * 2단계 회원가입: 이메일 인증 코드 확인
   */
  @Post('register/verify-code')
  async registerStep2(@Body() verifyEmailDto: VerifyEmailDto) {
    return await this.authService.registerStep2(verifyEmailDto)
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
  async refresh(@Req() request: Request) {
    const user = request['user'] as { sub: number }
    return await this.authService.refreshToken(user.sub)
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

  /**
   * 내 정보 조회
   */
  @Get('me')
  @UseGuards(AccessTokenGuard)
  async getMe(@UserDecorator() user: UserPayload): Promise<MeDto> {
    return await this.authService.getMe(user)
  }
}
