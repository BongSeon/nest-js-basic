import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
// import { PaginationDto } from './dto/post-pagination.dto'
import { Post } from './entities/post.entity'
import { User, UserRole } from '../users/entities/user.entity'
import { Image } from 'src/common/entities/image.entity'
import { S3UploadService } from '../common/services/s3-upload.service'
import { CommonService } from 'src/common/services/common.service'
import { CreatePostImageDto } from './image/dto/create-image.dto'
import { DEFAULT_POST_FIND_OPTIONS } from './const/default-post-find-options'
import { PaginatePostDto } from './dto/post-pagination.dto'

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>,
    private s3UploadService: S3UploadService,
    private commonService: CommonService,
    private dataSource: DataSource
  ) {}

  private formatPostResponse(post: Post) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...postWithoutUserId } = post
    return {
      ...postWithoutUserId,
    }
  }
  async createPost(createPostDto: CreatePostDto, userId: number): Promise<any> {
    // 사용자 존재 여부 확인
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    })
    if (!user) {
      throw new BadRequestException(`User with ID ${userId} not found`)
    }

    const post = this.postsRepository.create({
      ...createPostDto,
      images: [],
      userId: userId,
    })
    const savedPost = await this.postsRepository.save(post)

    // user 관계를 포함하여 다시 조회
    const postWithUser = await this.postsRepository.findOne({
      where: { id: savedPost.id },
      relations: ['user', 'user.profile', 'user.cover'],
    })

    // User 정보를 포함하여 반환하되 userId는 제외
    return this.formatPostResponse(postWithUser)
  }

  async createPostImage(dto: CreatePostImageDto): Promise<any> {
    // 이미지 URL이 있는 경우 temp에서 posts로 이동
    let finalImageUrl = dto.path
    console.log('Creating post with imageUrl:', dto.path)

    // 이미지 레포지토리에 저장
    const result = await this.imagesRepository.save({ ...dto })

    // 파일 옮기기
    if (dto.path) {
      console.log('Image URL contains temp path, moving to posts...')
      try {
        const movedImage = await this.s3UploadService.moveImageFromTempToPosts(
          dto.path
        )
        finalImageUrl = movedImage.url
        console.log('Image moved successfully, new URL:', finalImageUrl)
      } catch (error) {
        console.error('Failed to move image:', error)
        throw new BadRequestException(
          `이미지 이동에 실패했습니다: ${error.message}`
        )
      }
    } else {
      console.log('No temp image to move or imageUrl is null')
    }

    return result
  }

  async getPosts(dto: PaginatePostDto, currentUserId?: number) {
    const result = await this.paginatePosts(dto)

    // 현재 사용자의 좋아요 정보를 한 번의 쿼리로 가져오기
    let likedPostIds: number[] = []
    if (currentUserId && result.items.length > 0) {
      const postIds = result.items.map((post) => post.id)
      const likedPosts = await this.dataSource
        .createQueryBuilder()
        .select('postId')
        .from('post_like', 'pl')
        .where('pl.userId = :userId', { userId: currentUserId })
        .andWhere('pl.postId IN (:...postIds)', { postIds })
        .getRawMany()

      likedPostIds = likedPosts.map((like) => like.postId)
    }

    return {
      ...result,
      items: result.items.map((post) => {
        const postWithLiked = {
          ...post,
          liked: likedPostIds.includes(post.id) ? true : false,
        }
        return this.formatPostResponse(postWithLiked)
      }),
    }
  }

  async paginatePosts(dto: PaginatePostDto) {
    return this.commonService.paginate(
      dto,
      this.postsRepository,
      DEFAULT_POST_FIND_OPTIONS,
      'posts'
    )
  }

  async getPost(id: number, currentUserId?: number): Promise<any> {
    const post = await this.postsRepository.findOne({
      where: { id },
      ...DEFAULT_POST_FIND_OPTIONS,
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }

    // 현재 사용자의 좋아요 여부를 확인
    let isLiked = false
    if (currentUserId) {
      const likedPost = await this.dataSource
        .createQueryBuilder()
        .select('postId')
        .from('post_like', 'pl')
        .where('pl.userId = :userId', { userId: currentUserId })
        .andWhere('pl.postId = :postId', { postId: id })
        .getRawOne()

      isLiked = !!likedPost
    }

    // liked 정보를 포함하여 반환
    const postWithLiked = { ...post, liked: isLiked ? true : false }
    return this.formatPostResponse(postWithLiked)
  }

  async update(
    id: number,
    updatePostDto: UpdatePostDto,
    userId: number
  ): Promise<any> {
    const post = await this.postsRepository.findOne({
      where: { id },
      ...DEFAULT_POST_FIND_OPTIONS,
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
    await this.postsRepository.save(post)

    // 업데이트된 게시글을 liked 정보와 함께 다시 조회
    return this.getPost(id, userId)
  }

  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile', 'user.cover'],
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`)
    }

    // 게시글 작성자만 삭제할 수 있도록 권한 체크
    if (post.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own posts')
    }

    await this.postsRepository.remove(post)
  }

  async likePost(postId: number, userId: number): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // 포스트 존재 여부 확인
      const post = await queryRunner.manager.findOne(Post, {
        where: { id: postId },
        relations: ['likedBy'],
      })
      if (!post) {
        throw new NotFoundException(`Post with ID ${postId} not found`)
      }

      // 사용자 존재 여부 확인
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      })
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`)
      }

      // 이미 좋아요 했는지 확인
      const existingLike = await queryRunner.manager
        .createQueryBuilder()
        .select()
        .from('post_like', 'pl')
        .where('pl.postId = :postId', { postId })
        .andWhere('pl.userId = :userId', { userId })
        .getRawOne()

      if (existingLike) {
        throw new BadRequestException('You have already liked this post')
      }

      // post_like 테이블에 관계 추가
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into('post_like')
        .values({ postId, userId })
        .execute()

      // likeCount 증가
      await queryRunner.manager
        .createQueryBuilder()
        .update(Post)
        .set({ likeCount: () => 'likeCount + 1' })
        .where('id = :postId', { postId })
        .execute()

      await queryRunner.commitTransaction()

      // 업데이트된 포스트를 liked 정보와 함께 반환
      return this.getPost(postId, userId)
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async unlikePost(postId: number, userId: number): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // 포스트 존재 여부 확인
      const post = await queryRunner.manager.findOne(Post, {
        where: { id: postId },
      })
      if (!post) {
        throw new NotFoundException(`Post with ID ${postId} not found`)
      }

      // 좋아요 관계 확인
      const existingLike = await queryRunner.manager
        .createQueryBuilder()
        .select()
        .from('post_like', 'pl')
        .where('pl.postId = :postId', { postId })
        .andWhere('pl.userId = :userId', { userId })
        .getRawOne()

      if (!existingLike) {
        throw new BadRequestException('You have not liked this post')
      }

      // post_like 테이블에서 관계 제거
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from('post_like')
        .where('postId = :postId', { postId })
        .andWhere('userId = :userId', { userId })
        .execute()

      // likeCount 감소
      await queryRunner.manager
        .createQueryBuilder()
        .update(Post)
        .set({ likeCount: () => 'likeCount - 1' })
        .where('id = :postId', { postId })
        .execute()

      await queryRunner.commitTransaction()

      // 업데이트된 포스트를 liked 정보와 함께 반환
      return this.getPost(postId, userId)
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }
}
