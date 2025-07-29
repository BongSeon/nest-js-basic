import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { Post } from './entities/post.entity'
import { User, UserRole } from '../users/entities/user.entity'
import { Image, ImageType } from 'src/common/entities/image.entity'
import { CommonService } from 'src/common/services/common.service'
import { S3UploadService } from 'src/common/services/s3-upload.service'
import { S3_IMAGES_PATH, S3_POST_IMAGE_PATH } from 'src/common/const/path.const'
import { DEFAULT_POST_FIND_OPTIONS } from './const/default-post-find-options'
import { GetPostsDto } from './dto/get-posts.dto'

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>,
    private commonService: CommonService,
    private s3UploadService: S3UploadService,
    private dataSource: DataSource
  ) {}

  private formatPostResponse(post: Post) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...postWithoutUserId } = post
    return {
      ...postWithoutUserId,
    }
  }

  getRepository(qr?: QueryRunner) {
    return qr ? qr.manager.getRepository<Post>(Post) : this.postsRepository
  }

  async createPost(
    createPostDto: CreatePostDto,
    userId: number,
    qr?: QueryRunner
  ): Promise<any> {
    const repository = this.getRepository(qr)
    const imageRepository = qr
      ? qr.manager.getRepository<Image>(Image)
      : this.imagesRepository

    // 사용자 존재 여부 확인
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    })
    if (!user) {
      throw new BadRequestException(`User with ID ${userId} not found`)
    }

    const post = repository.create({
      title: createPostDto.title,
      content: createPostDto.content,
      type: createPostDto.type,
      images: [],
      userId: userId,
    })
    const savedPost = await repository.save(post)

    // added 이미지들을 temp에서 posts로 이동 및 Image 엔티티 생성
    if (createPostDto.images?.added && createPostDto.images.added.length > 0) {
      const imageEntities = []

      for (let i = 0; i < createPostDto.images.added.length; i++) {
        const fileName = createPostDto.images.added[i]
        try {
          // S3에서 temp -> posts로 이미지 이동
          await this.s3UploadService.moveImageFromTempToPosts(fileName)

          // Image 엔티티 생성
          const imageEntity = imageRepository.create({
            path: fileName,
            type: ImageType.POST_IMAGE,
            order: i,
            post: savedPost,
          })

          imageEntities.push(imageEntity)
        } catch (error) {
          console.error(`Failed to move image ${fileName}:`, error)
          // 개별 이미지 이동 실패는 로그만 남기고 계속 진행
        }
      }

      if (imageEntities.length > 0) {
        await imageRepository.save(imageEntities)
      }
    }

    // user 관계를 포함하여 다시 조회
    const postWithUser = await repository.findOne({
      where: { id: savedPost.id },
      relations: ['user', 'user.profile', 'user.cover', 'images'],
    })

    // User 정보를 포함하여 반환하되 userId는 제외
    return this.formatPostResponse(postWithUser)
  }

  async getPosts(dto: GetPostsDto, currentUserId?: number) {
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

  async paginatePosts(dto: GetPostsDto) {
    return this.commonService.paginate(
      dto,
      this.postsRepository,
      DEFAULT_POST_FIND_OPTIONS,
      'posts'
    )
  }

  async getPost(
    id: number,
    currentUserId?: number,
    qr?: QueryRunner
  ): Promise<any> {
    const repository = this.getRepository(qr)

    const post = await repository.findOne({
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
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const postRepository = queryRunner.manager.getRepository<Post>(Post)
      const imageRepository = queryRunner.manager.getRepository<Image>(Image)

      const post = await postRepository.findOne({
        where: { id },
        relations: ['images'],
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

      // 기본 게시글 정보 업데이트 (images 제외)
      const { images, ...postUpdateData } = updatePostDto
      Object.assign(post, postUpdateData)
      await postRepository.save(post)

      // 이미지 처리
      if (images) {
        // 기존 이미지들 가져오기
        const existingImages = await imageRepository.find({
          where: { post: { id } },
        })

        // kept에 없는 기존 이미지들 삭제
        const keptImagePaths = images.kept || []
        const imagesToDelete = existingImages.filter(
          (img) => !keptImagePaths.includes(img.path)
        )

        if (imagesToDelete.length > 0) {
          // S3에서 실제 파일들 삭제
          for (const image of imagesToDelete) {
            try {
              const s3Key = `${S3_IMAGES_PATH}/${S3_POST_IMAGE_PATH}/${image.path}`
              await this.s3UploadService.deleteImage(s3Key)
              // console.log(`Successfully deleted image from S3: ${s3Key}`)
            } catch (error) {
              console.error(
                `Failed to delete image from S3: ${image.path}`,
                error
              )
              // S3 삭제 실패해도 DB 삭제는 계속 진행
            }
          }

          // 데이터베이스에서 이미지 레코드 삭제
          const imageIdsToDelete = imagesToDelete.map((img) => img.id)
          await imageRepository.delete(imageIdsToDelete)
          // console.log(`Deleted ${imageIdsToDelete.length} images from database`)
        }

        // added 이미지들을 temp에서 posts로 이동 및 Image 엔티티 생성
        if (images.added && images.added.length > 0) {
          const imageEntities = []

          // 기존 kept 이미지들의 개수를 계산하여 order 시작점 설정
          const keptCount = (images.kept || []).length

          for (let i = 0; i < images.added.length; i++) {
            const fileName = images.added[i]
            try {
              // S3에서 temp -> posts로 이미지 이동
              await this.s3UploadService.moveImageFromTempToPosts(fileName)

              // Image 엔티티 생성 (order는 kept 이미지 다음부터 시작)
              const imageEntity = imageRepository.create({
                path: fileName,
                type: ImageType.POST_IMAGE,
                order: keptCount + i,
                post: post,
              })

              imageEntities.push(imageEntity)
            } catch (error) {
              console.error(`Failed to move image ${fileName}:`, error)
              // 개별 이미지 이동 실패는 로그만 남기고 계속 진행
            }
          }

          if (imageEntities.length > 0) {
            await imageRepository.save(imageEntities)
          }
        }
      }

      await queryRunner.commitTransaction()

      // 업데이트된 게시글을 liked 정보와 함께 다시 조회
      return this.getPost(id, userId)
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const post = await queryRunner.manager.findOne(Post, {
        where: { id },
        relations: ['user', 'user.profile', 'user.cover', 'images'],
      })
      if (!post) {
        throw new NotFoundException(`Post with ID ${id} not found`)
      }

      // 게시글 작성자만 삭제할 수 있도록 권한 체크
      if (post.userId !== userId && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only delete your own posts')
      }

      // 1. 좋아요 관계 삭제 (post_like 테이블)
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from('post_like')
        .where('postId = :postId', { postId: id })
        .execute()

      // 2. 게시물 이미지 삭제
      if (post.images && post.images.length > 0) {
        // S3에서 실제 파일들 삭제
        for (const image of post.images) {
          try {
            const s3Key = `${S3_IMAGES_PATH}/${S3_POST_IMAGE_PATH}/${image.path}`
            await this.s3UploadService.deleteImage(s3Key)
            // console.log(`Successfully deleted image from S3: ${s3Key}`)
          } catch (error) {
            console.error(
              `Failed to delete image from S3: ${image.path}`,
              error
            )
            // S3 삭제 실패해도 DB 삭제는 계속 진행
          }
        }

        // 데이터베이스에서 이미지 레코드 삭제
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(Image)
          .where('postId = :postId', { postId: id })
          .execute()

        // console.log(`Deleted ${post.images.length} images from S3 and database`)
      }

      // 3. 게시물 삭제
      await queryRunner.manager.remove(Post, post)

      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      console.error('게시물 삭제 중 오류 발생:', error)
      throw error
    } finally {
      await queryRunner.release()
    }
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
