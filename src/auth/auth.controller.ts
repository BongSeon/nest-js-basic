import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { BasicAuthGuard } from './guards/basic-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.registerWithEmail(registerDto)
  }

  @Post('login')
  @UseGuards(BasicAuthGuard)
  async login(@Req() request: Request) {
    const { username, password } = request['credentials']
    return await this.authService.loginWithUsername({ username, password })
  }
}
