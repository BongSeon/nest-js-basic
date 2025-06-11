import { Injectable, NotFoundException } from '@nestjs/common'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { Post } from './entities/post.entity'

@Injectable()
export class PostsService {
  private posts: Post[] = []
  private idCounter = 1

  create(createPostDto: CreatePostDto): Post {
    const post: Post = {
      id: this.idCounter++,
      ...createPostDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.posts.push(post)
    return post
  }

  findAll(): Post[] {
    return this.posts
  }

  findOne(id: number): Post {
    const post = this.posts.find((post) => post.id === id)
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }
    return post
  }

  update(id: number, updatePostDto: UpdatePostDto): Post {
    const post = this.findOne(id)
    Object.assign(post, updatePostDto, { updatedAt: new Date() })
    return post
  }

  remove(id: number): void {
    const index = this.posts.findIndex((post) => post.id === id)
    if (index === -1) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }
    this.posts.splice(index, 1)
  }
}
