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
} from '@nestjs/common'
import { PostsService } from './posts.service'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { PaginatePostDto } from './dto/post-pagination.dto'
import { AccessTokenGuard } from '../auth/guards/bearer-token.guard'
import { User } from 'src/users/decorator/user.decorator'
import { UserPayload } from 'src/users/types/user-payload.interface'
import { ImageType } from 'src/common/entities/image.entity'

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(
    @User('id') userId: number,
    @Body()
    dto: CreatePostDto
  ): Promise<any> {
    const post = await this.postsService.createPost(dto, userId)

    // 이미지가 생성되면서 이미지들이 생성한 post와 연결되게 됨
    for (let i = 0; i < dto.images.length; i++) {
      await this.postsService.createPostImage({
        post: post,
        order: i,
        path: dto.images[i],
        type: ImageType.POST_IMAGE,
      })
    }

    return this.postsService.getPost(post.id)
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async getPosts(@Query() paginationDto: PaginatePostDto): Promise<any> {
    return await this.postsService.getPosts(paginationDto)
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  async getPost(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return await this.postsService.getPost(id)
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
  ): Promise<void> {
    // 삭제 권한 체크용 role을 전달
    await this.postsService.remove(id, user.id, user.role)
  }
}
