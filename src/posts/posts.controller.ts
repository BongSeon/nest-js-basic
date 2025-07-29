import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
  UseInterceptors,
} from '@nestjs/common'
import { PostsService } from './posts.service'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { GetPostsDto } from './dto/get-posts.dto'
import { AccessTokenGuard } from '../auth/guards/bearer-token.guard'
import { User } from 'src/users/decorator/user.decorator'
import { UserPayload } from 'src/users/types/user-payload.interface'
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor'
import { QueryRunner } from 'src/common/decorator/query-runner.decorator'
import { QueryRunner as QR } from 'typeorm'

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(TransactionInterceptor)
  async create(
    @User('id') userId: number,
    @Body() dto: CreatePostDto,
    @QueryRunner() qr: QR
  ): Promise<any> {
    // PostsService에서 이미지 처리까지 모두 완료됨
    const post = await this.postsService.createPost(dto, userId, qr)

    return this.postsService.getPost(post.id, userId, qr)
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async getPosts(
    @Query() paginationDto: GetPostsDto,
    @User('id') userId: number
  ): Promise<any> {
    return await this.postsService.getPosts(paginationDto, userId)
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  async getPost(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ): Promise<any> {
    return await this.postsService.getPost(id, userId)
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @User() user: UserPayload
  ): Promise<any> {
    const userId = user.id
    return await this.postsService.update(id, updatePostDto, userId)
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserPayload
  ): Promise<any> {
    // 삭제 권한 체크용 role을 전달
    console.log('id', id)
    console.log('user', user)
    await this.postsService.remove(id, user.id, user.role)

    return {
      data: { id },
      message: '게시물이 성공적으로 삭제되었습니다.',
    }
  }

  @Post(':id/like')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(TransactionInterceptor)
  async likePost(
    @Param('id', ParseIntPipe) postId: number,
    @User('id') userId: number
  ): Promise<any> {
    return await this.postsService.likePost(postId, userId)
  }

  @Delete(':id/like')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(TransactionInterceptor)
  async unlikePost(
    @Param('id', ParseIntPipe) postId: number,
    @User('id') userId: number
  ): Promise<any> {
    return await this.postsService.unlikePost(postId, userId)
  }
}
