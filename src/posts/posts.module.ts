import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { PostsController } from './posts.controller'
import { PostsService } from './posts.service'
import { Post } from './entities/post.entity'
import { User } from '../users/entities/user.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, User]),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'access-secret',
      signOptions: { expiresIn: '15m' },
    }),
    AuthModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
