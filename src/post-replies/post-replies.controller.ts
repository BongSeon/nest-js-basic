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
import { PostRepliesService } from './post-replies.service'
import { CreatePostReplyDto } from './dto/create-post-reply.dto'
import { UpdatePostReplyDto } from './dto/update-post-reply.dto'
import { PaginatePostReplyDto } from './dto/paginate-post-reply.dto'
import { AccessTokenGuard } from '../auth/guards/bearer-token.guard'
import { User } from '../users/decorator/user.decorator'
import { UserPayload } from '../users/types/user-payload.interface'
import { TransactionInterceptor } from '../common/interceptors/transaction.interceptor'
import { QueryRunner } from '../common/decorator/query-runner.decorator'
import { QueryRunner as QR } from 'typeorm'

@Controller('posts/:postId/replies')
export class PostRepliesController {
  constructor(private readonly postRepliesService: PostRepliesService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(TransactionInterceptor)
  async create(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() createPostReplyDto: CreatePostReplyDto,
    @User('id') userId: number,
    @QueryRunner() qr: QR
  ) {
    return this.postRepliesService.create(
      postId,
      createPostReplyDto,
      userId,
      qr
    )
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async findAllByPost(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() paginationDto: PaginatePostReplyDto
  ) {
    return this.postRepliesService.findAllByPost(postId, paginationDto)
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postRepliesService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostReplyDto: UpdatePostReplyDto,
    @User() user: UserPayload
  ) {
    return this.postRepliesService.update(id, updatePostReplyDto, user.id)
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(TransactionInterceptor)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserPayload,
    @QueryRunner() qr: QR
  ) {
    await this.postRepliesService.remove(id, user.id, qr)
    return {
      data: { id },
      message: '댓글이 성공적으로 삭제되었습니다.',
    }
  }
}
