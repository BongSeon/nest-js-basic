import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { PostsController } from './posts.controller'
import { PostsService } from './posts.service'
import { Post } from './entities/post.entity'
import { User } from '../users/entities/user.entity'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'jwt-secret',
      signOptions: { expiresIn: '15m' },
    }),
    AuthModule,
    UsersModule,
    CommonModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
