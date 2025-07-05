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
  Req,
  Query,
} from '@nestjs/common'
import { Request } from 'express'
import { PostsService } from './posts.service'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { PaginationDto } from './dto/pagination.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { JwtPayload } from '../auth/types/jwt-payload.interface'

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createPostDto: CreatePostDto,
    @Req() request: Request
  ): Promise<any> {
    const user = request['user'] as JwtPayload
    const userId = user.sub // JWT 토큰에서 추출한 사용자 ID
    return await this.postsService.create(createPostDto, userId)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() paginationDto: PaginationDto): Promise<any> {
    return await this.postsService.findAll(paginationDto)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return await this.postsService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Req() request: Request
  ): Promise<any> {
    const user = request['user'] as JwtPayload
    const userId = user.sub
    return await this.postsService.update(id, updatePostDto, userId)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request
  ): Promise<void> {
    const user = request['user'] as JwtPayload
    const userId = user.sub
    await this.postsService.remove(id, userId)
  }
}
