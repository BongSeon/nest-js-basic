import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common'
import { PostsService } from './posts.service'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { Post as PostEntity } from './entities/post.entity'

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Body() createPostDto: CreatePostDto): PostEntity {
    return this.postsService.create(createPostDto)
  }

  @Get()
  findAll(): PostEntity[] {
    return this.postsService.findAll()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): PostEntity {
    return this.postsService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto
  ): PostEntity {
    return this.postsService.update(id, updatePostDto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.postsService.remove(id)
  }
}
