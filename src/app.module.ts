import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PostsModule } from './posts/posts.module'
import { UsersModule } from './users/users.module'
import { Post } from './posts/entities/post.entity'
import { User } from './users/entities/user.entity'
import { AuthModule } from './auth/auth.module'
import { LandingGateway } from './gateway/landing.gateway'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: '1234',
      database: 'nest_test',
      entities: [Post, User],
      synchronize: true, // 개발 환경에서만 사용. 프로덕션에서는 false로 설정
    }),
    PostsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, LandingGateway],
})
export class AppModule {}
