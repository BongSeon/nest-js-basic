import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { BasicTokenGuard } from './guards/basic-token.guard'
import {
  AccessTokenGuard,
  BearerTokenGuard,
  RefreshTokenGuard,
} from './guards/bearer-token.guard'
import { TokenBlacklistService } from './services/token-blacklist.service'
import { User } from '../users/entities/user.entity'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'access-secret',
      signOptions: { expiresIn: '15m' },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BasicTokenGuard,
    BearerTokenGuard,
    AccessTokenGuard,
    RefreshTokenGuard,
    TokenBlacklistService,
  ],
  exports: [
    AuthService,
    BasicTokenGuard,
    BearerTokenGuard,
    AccessTokenGuard,
    RefreshTokenGuard,
    TokenBlacklistService,
  ],
})
export class AuthModule {}
