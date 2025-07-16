import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { PaginationDto } from './dto/pagination.dto'
import { Post } from './entities/post.entity'
import { User } from '../users/entities/user.entity'
import { S3UploadService } from '../common/services/s3-upload.service'

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private s3UploadService: S3UploadService
  ) {}

  private formatPostResponse(post: Post) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...postWithoutUserId } = post
    return {
      ...postWithoutUserId,
    }
  }

  async create(createPostDto: CreatePostDto, userId: number): Promise<any> {
    // 사용자 존재 여부 확인
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    })
    if (!user) {
      throw new BadRequestException(`User with ID ${userId} not found`)
    }

    // 이미지 URL이 있는 경우 temp에서 posts로 이동
    let finalImageUrl = createPostDto.imageUrl
    if (
      createPostDto.imageUrl &&
      createPostDto.imageUrl.includes('/images/temp/')
    ) {
      try {
        // URL에서 key 추출 (예: "https://.../images/temp/filename.png" -> "/images/temp/filename.png")
        const urlParts = createPostDto.imageUrl.split('/')
        const key = `/${urlParts.slice(-2).join('/')}` // "/images/temp/filename.png"

        const movedImage =
          await this.s3UploadService.moveImageFromTempToPosts(key)
        finalImageUrl = movedImage.url
      } catch (error) {
        throw new BadRequestException(
          `이미지 이동에 실패했습니다: ${error.message}`
        )
      }
    }

    const post = this.postsRepository.create({
      ...createPostDto,
      imageUrl: finalImageUrl,
      userId: userId,
    })
    const savedPost = await this.postsRepository.save(post)

    // user 관계를 포함하여 다시 조회
    const postWithUser = await this.postsRepository.findOne({
      where: { id: savedPost.id },
      relations: ['user'],
    })

    // User 정보를 포함하여 반환하되 userId는 제외
    return this.formatPostResponse(postWithUser)
  }

  async findAll(
    paginationDto: PaginationDto = { page: 1, limit: 10 }
  ): Promise<{
    items: any[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const { page = 1, limit = 10 } = paginationDto
    const skip = (page - 1) * limit

    const [posts, total] = await this.postsRepository.findAndCount({
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    // 각 Post의 User 정보를 필터링하고 userId 제거
    const formattedPosts = posts.map((post) => this.formatPostResponse(post))

    return {
      items: formattedPosts,
      total,
      page,
      limit,
      totalPages,
    }
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

  async update(
    id: number,
    updatePostDto: UpdatePostDto,
    userId: number
  ): Promise<any> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }

    // 게시글 작성자만 수정할 수 있도록 권한 체크
    if (post.userId !== userId) {
      throw new ForbiddenException('You can only update your own posts')
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

  async remove(id: number, userId: number): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }

    // 게시글 작성자만 삭제할 수 있도록 권한 체크
    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts')
    }

    await this.postsRepository.remove(post)
  }
}
