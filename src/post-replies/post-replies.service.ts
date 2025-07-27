import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'
import { PostReply } from './entities/post-reply.entity'
import { Post } from '../posts/entities/post.entity'
import { User } from '../users/entities/user.entity'
import { CreatePostReplyDto } from './dto/create-post-reply.dto'
import { UpdatePostReplyDto } from './dto/update-post-reply.dto'
import { PaginatePostReplyDto } from './dto/post-reply-pagination.dto'
import { CommonService } from '../common/services/common.service'

@Injectable()
export class PostRepliesService {
  constructor(
    @InjectRepository(PostReply)
    private postRepliesRepository: Repository<PostReply>,
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private commonService: CommonService,
    private dataSource: DataSource
  ) {}

  getRepository(qr?: QueryRunner) {
    return qr
      ? qr.manager.getRepository<PostReply>(PostReply)
      : this.postRepliesRepository
  }

  async create(
    postId: number,
    createPostReplyDto: CreatePostReplyDto,
    userId: number,
    qr?: QueryRunner
  ): Promise<PostReply> {
    const repository = this.getRepository(qr)

    // 게시글 존재 여부 확인
    const post = await this.postsRepository.findOne({
      where: { id: postId },
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`)
    }

    // 사용자 존재 여부 확인
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    })
    if (!user) {
      throw new BadRequestException(`User with ID ${userId} not found`)
    }

    const reply = repository.create({
      ...createPostReplyDto,
      postId,
      userId,
    })

    const savedReply = await repository.save(reply)

    // replyCount 증가
    const postRepository = qr
      ? qr.manager.getRepository(Post)
      : this.postsRepository

    await postRepository
      .createQueryBuilder()
      .update(Post)
      .set({ replyCount: () => 'replyCount + 1' })
      .where('id = :postId', { postId })
      .execute()

    // 댓글 정보만 반환 (관계 정보 제외)
    return savedReply
  }

  async findAllByPost(postId: number, dto: PaginatePostReplyDto) {
    // 게시글 존재 여부 확인
    const post = await this.postsRepository.findOne({
      where: { id: postId },
    })
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`)
    }

    return this.commonService.paginate(
      dto,
      this.postRepliesRepository,
      {
        where: { postId },
        relations: ['user', 'user.profile'],
        order: { createdAt: 'DESC' },
      },
      'post-replies'
    )
  }

  async findOne(id: number, qr?: QueryRunner): Promise<PostReply> {
    const repository = this.getRepository(qr)

    const reply = await repository.findOne({
      where: { id },
    })

    if (!reply) {
      throw new NotFoundException(`Reply with ID ${id} not found`)
    }

    return reply
  }

  async update(
    id: number,
    updatePostReplyDto: UpdatePostReplyDto,
    userId: number
  ): Promise<PostReply> {
    const reply = await this.findOne(id)

    // 댓글 작성자만 수정할 수 있도록 권한 체크
    if (reply.userId !== userId) {
      throw new ForbiddenException('You can only update your own replies')
    }

    Object.assign(reply, updatePostReplyDto)
    const updatedReply = await this.postRepliesRepository.save(reply)

    return updatedReply
  }

  async remove(id: number, userId: number, qr?: QueryRunner): Promise<void> {
    const repository = this.getRepository(qr)
    const reply = await this.findOne(id, qr)

    // 댓글 작성자만 삭제할 수 있도록 권한 체크
    if (reply.userId !== userId) {
      throw new ForbiddenException('You can only delete your own replies')
    }

    // 댓글 삭제
    await repository.remove(reply)

    // replyCount 감소
    const postRepository = qr
      ? qr.manager.getRepository(Post)
      : this.postsRepository

    await postRepository
      .createQueryBuilder()
      .update(Post)
      .set({ replyCount: () => 'replyCount - 1' })
      .where('id = :postId', { postId: reply.postId })
      .execute()
  }
}
