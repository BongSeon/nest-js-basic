import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { Post } from './entities/post.entity'
import { User } from '../users/entities/user.entity'

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  private filterUserInfo(user: User) {
    if (!user) return null
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
    }
  }

  private formatPostResponse(post: Post) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...postWithoutUserId } = post
    return {
      ...postWithoutUserId,
      user: this.filterUserInfo(post.user),
    }
  }

  async create(createPostDto: CreatePostDto): Promise<any> {
    // 사용자 존재 여부 확인
    const user = await this.usersRepository.findOne({
      where: { id: createPostDto.userId },
    })
    if (!user) {
      throw new BadRequestException(
        `User with ID ${createPostDto.userId} not found`
      )
    }

    const post = this.postsRepository.create(createPostDto)
    const savedPost = await this.postsRepository.save(post)

    // User 정보를 포함하여 반환하되 userId는 제외
    return this.formatPostResponse(savedPost)
  }

  async findAll(): Promise<any[]> {
    const posts = await this.postsRepository.find({
      relations: ['user'],
    })

    // 각 Post의 User 정보를 필터링하고 userId 제거
    return posts.map((post) => this.formatPostResponse(post))
  }

  async findOne(id: number): Promise<any> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }

    // User 정보를 필터링하고 userId 제거하여 반환
    return this.formatPostResponse(post)
  }

  async update(id: number, updatePostDto: UpdatePostDto): Promise<any> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }

    // userId가 제공된 경우 사용자 존재 여부 확인
    if (updatePostDto.userId) {
      const user = await this.usersRepository.findOne({
        where: { id: updatePostDto.userId },
      })
      if (!user) {
        throw new BadRequestException(
          `User with ID ${updatePostDto.userId} not found`
        )
      }
    }

    Object.assign(post, updatePostDto)
    const updatedPost = await this.postsRepository.save(post)

    // User 정보를 필터링하고 userId 제거하여 반환
    return this.formatPostResponse(updatedPost)
  }

  async remove(id: number): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }
    await this.postsRepository.remove(post)
  }
}
