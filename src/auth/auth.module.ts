import { forwardRef, Module } from '@nestjs/common'
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
import { RolesGuard } from './guards/roles.guard'
import { TokenBlacklistService } from './services/token-blacklist.service'
import { User } from '../users/entities/user.entity'
import { Image } from '../common/entities/image.entity'
import { UsersModule } from '../users/users.module'
import { S3UploadService } from '../common/services/s3-upload.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Image]),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'access-secret',
      signOptions: { expiresIn: '15m' },
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BasicTokenGuard,
    BearerTokenGuard,
    AccessTokenGuard,
    RefreshTokenGuard,
    RolesGuard,
    TokenBlacklistService,
    S3UploadService,
  ],
  exports: [
    AuthService,
    BasicTokenGuard,
    BearerTokenGuard,
    AccessTokenGuard,
    RefreshTokenGuard,
    RolesGuard,
    TokenBlacklistService,
    JwtModule,
  ],
})
export class AuthModule {}
