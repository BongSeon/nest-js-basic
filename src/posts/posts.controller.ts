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
import { PaginationDto } from './dto/pagination.dto'
import { AccessTokenGuard } from '../auth/guards/bearer-token.guard'
import { User } from 'src/users/decorator/user.decorator'
import { UserPayload } from 'src/users/types/user-payload.interface'

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(
    @User() user: UserPayload,
    @Body()
    createPostDto: CreatePostDto
  ): Promise<any> {
    const userId = user.id
    return await this.postsService.create(createPostDto, userId)
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async findAll(@Query() paginationDto: PaginationDto): Promise<any> {
    return await this.postsService.findAll(paginationDto)
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return await this.postsService.findOne(id)
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
    const userId = user.id
    await this.postsService.remove(id, userId)
  }
}
