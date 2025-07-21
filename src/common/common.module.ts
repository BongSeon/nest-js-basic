import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { S3UploadService } from './services/s3-upload.service'
import { UploadController } from './controllers/upload.controller'
import { User } from '../users/entities/user.entity'
import { Image } from './entities/image.entity'
import {
  AccessTokenGuard,
  BearerTokenGuard,
  RefreshTokenGuard,
} from '../auth/guards/bearer-token.guard'
import { TokenBlacklistService } from '../auth/services/token-blacklist.service'
import { AuthService } from '../auth/auth.service'
import { CommonService } from './services/common.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Image]),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'access-secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [UploadController],
  providers: [
    S3UploadService,
    AccessTokenGuard,
    BearerTokenGuard,
    RefreshTokenGuard,
    TokenBlacklistService,
    AuthService,
    CommonService,
  ],
  exports: [S3UploadService, CommonService],
})
export class CommonModule {}
