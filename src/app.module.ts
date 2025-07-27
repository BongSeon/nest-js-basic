import { ClassSerializerInterceptor, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PostsModule } from './posts/posts.module'
import { UsersModule } from './users/users.module'
import { PostRepliesModule } from './post-replies/post-replies.module'
import { Post } from './posts/entities/post.entity'
import { User } from './users/entities/user.entity'
import { Image } from './common/entities/image.entity'
import { PostReply } from './post-replies/entities/post-reply.entity'
import { AuthModule } from './auth/auth.module'
import { CommonModule } from './common/common.module'
import { LandingGateway } from './gateway/landing.gateway'
import { APP_INTERCEPTOR } from '@nestjs/core'
import {
  ENV_DB_DATABASE_KEY,
  ENV_DB_HOST_KEY,
  ENV_DB_PASSWORD_KEY,
  ENV_DB_PORT_KEY,
  ENV_DB_USERNAME_KEY,
} from './common/const/env-keys.const'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 전역으로 사용 가능하도록 설정
      envFilePath: '.env.local', // .env 파일 경로
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env[ENV_DB_HOST_KEY],
      port: parseInt(process.env[ENV_DB_PORT_KEY]),
      username: process.env[ENV_DB_USERNAME_KEY],
      password: process.env[ENV_DB_PASSWORD_KEY],
      database: process.env[ENV_DB_DATABASE_KEY],
      entities: [Post, User, Image, PostReply],
      synchronize: true, // 개발 환경에서만 사용. 프로덕션에서는 false로 설정
    }),
    PostsModule,
    UsersModule,
    PostRepliesModule,
    AuthModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    LandingGateway,
  ],
})
export class AppModule {}
