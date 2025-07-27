import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { PostRepliesController } from './post-replies.controller'
import { PostRepliesService } from './post-replies.service'
import { PostReply } from './entities/post-reply.entity'
import { Post } from '../posts/entities/post.entity'
import { User } from '../users/entities/user.entity'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([PostReply, Post, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'jwt-secret',
      signOptions: { expiresIn: '15m' },
    }),
    AuthModule,
    UsersModule,
    CommonModule,
  ],
  controllers: [PostRepliesController],
  providers: [PostRepliesService],
  exports: [PostRepliesService],
})
export class PostRepliesModule {}
