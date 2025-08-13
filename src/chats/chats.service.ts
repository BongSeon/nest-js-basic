import { Chat, ChatType } from './entities/chat.entity'
import { ChatLastRead } from './entities/chat-last-read.entity'
import { Message } from './messages/entities/message.entity'
import { CommonService } from 'src/common/services/common.service'
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Not, Repository } from 'typeorm'
import { CreateChatDto } from './dto/create-chat.dto'
import { UserRole } from 'src/users/entities/user.entity'
import { UserPayload } from 'src/users/types/user-payload.interface'
import { PaginateChatDto } from './dto/paginate-chat.dto'

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatLastRead)
    private readonly chatLastReadRepository: Repository<ChatLastRead>,
    private readonly commonService: CommonService
  ) {}

  async paginateChats(dto: PaginateChatDto, userId?: number) {
    let where = dto.type ? { type: dto.type } : { type: Not(ChatType.SUPPORT) }

    if (userId) {
      where = { ...where, ...{ users: { id: userId } } }
    }

    const result = await this.commonService.paginate(
      dto,
      this.chatRepository,
      {
        where,
        relations: ['users', 'users.profile', 'owner', 'owner.profile'],
      },
      'chats'
    )

    // users: { id: userId } 조건으로 조회 시 users 관계가 1명으로만 채워지는 이슈 보정
    if (userId && result.items.length > 0) {
      const ids = result.items.map((c: Chat) => c.id)
      const fullChats = await this.chatRepository.find({
        where: { id: In(ids) },
        relations: ['users', 'users.profile', 'owner', 'owner.profile'],
      })
      const fullMap = new Map(fullChats.map((c) => [c.id, c]))
      result.items = result.items.map((c: Chat) => fullMap.get(c.id) || c)
    }

    // TODO: 성능 이슈 있을 수 있음, 추후 redis 적용 필요
    if (dto.withUnreadCount && userId) {
      const itemsWithUnread = await Promise.all(
        result.items.map(async (chat: Chat) => {
          const unreadCount = await this.getUnreadCount(chat.id, userId)
          return { ...(chat as any), unreadCount }
        })
      )

      return { ...result, items: itemsWithUnread }
    }

    return result
  }

  async createChat(dto: CreateChatDto, ownerId: number) {
    // title이 없으면 현재 날짜로 기본값 생성
    const defaultTitle =
      dto.title ||
      `채팅방 ${new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    const chat = await this.chatRepository.save({
      // 채팅방 생성 시 채팅방에 참여하는 유저들을 저장한다.
      // [{id: 1}, {id: 2}]
      users: dto.userIds?.map((id) => ({ id })) || [{ id: ownerId }],
      owner: { id: ownerId },
      title: defaultTitle,
      type: dto.type,
    })

    return this.chatRepository.findOne({
      where: { id: chat.id },
      relations: ['users', 'users.profile', 'owner', 'owner.profile'],
    })
  }

  async getChatById(chatId: number) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['users', 'users.profile', 'owner', 'owner.profile'],
    })

    if (!chat) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.')
    }

    return chat
  }

  /**
   * 특정 유저의 채팅방 미확인 메시지 개수
   */
  async getUnreadCount(chatId: number, userId: number): Promise<number> {
    // 사용자의 마지막 읽음 시각 조회
    const lastRead = await this.chatLastReadRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
    })

    // 마지막 읽음이 없다면 방 생성 이후 모든 메시지를 미확인으로 간주
    const qb = this.chatRepository.manager
      .getRepository(Message)
      .createQueryBuilder('message')
      .innerJoin('message.chat', 'chat')
      .where('chat.id = :chatId', { chatId })

    if (lastRead?.lastReadAt) {
      qb.andWhere('message.createdAt > :lastReadAt', {
        lastReadAt: lastRead.lastReadAt,
      })
    }

    // 내가 보낸 메시지는 제외 (이부분은 불필요해서 주석처리 함, 메시지 보내면서 마지막 읽은 시간을 기록하기 때문)
    // qb.andWhere('message.userId != :userId', { userId })

    const count = await qb.getCount()
    return count
  }

  /**
   * 해당 방을 읽었음을 기록 (지금 시각으로 갱신)
   */
  async markChatRead(chatId: number, userId: number): Promise<void> {
    const existing = await this.chatLastReadRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
    })

    if (existing) {
      existing.lastReadAt = new Date()
      await this.chatLastReadRepository.save(existing)
      return
    }

    await this.chatLastReadRepository.save({
      chat: { id: chatId } as any,
      user: { id: userId } as any,
      lastReadAt: new Date(),
    })
  }

  async checkIfChatExists(chatId: number) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    })

    return !!chat
  }

  async isMember(chatId: number, userId: number): Promise<boolean> {
    const count = await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.users', 'user', 'user.id = :userId', { userId })
      .where('chat.id = :chatId', { chatId })
      .getCount()

    return count > 0
  }

  async getUserChatIds(userId: number): Promise<number[]> {
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.users', 'user', 'user.id = :userId', { userId })
      .select('chat.id', 'id')
      .getRawMany<{ id: number }>()

    return chats.map((c) => Number(c.id))
  }

  async getAllChatIds(): Promise<number[]> {
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.id', 'id')
      .getRawMany<{ id: number }>()

    return chats.map((c) => Number(c.id))
  }

  async joinChat(chatId: number, user: UserPayload) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['users', 'owner'],
    })

    if (!chat) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.')
    }

    // ADMIN은 멤버십 기록 없이 접근 가능
    if (user.role === UserRole.ADMIN) {
      return this.getChatById(chatId)
    }

    // private 방은 개설자만 추가 가능하도록 제한 (단순 정책)
    if (chat.type === ChatType.PRIVATE && chat.owner?.id !== user.id) {
      throw new ForbiddenException(
        '비공개 채팅방은 개설자만 멤버를 추가할 수 있습니다.'
      )
    }

    const alreadyMember = chat.users?.some((u) => u.id === user.id)
    if (alreadyMember) {
      return this.getChatById(chatId)
    }

    const updated = await this.chatRepository.save({
      id: chatId,
      users: [...(chat.users || []), { id: user.id } as any],
    })

    return this.getChatById(updated.id)
  }

  async exitChat(chatId: number, user: UserPayload) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['users'],
    })

    if (!chat) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.')
    }

    // ADMIN은 멤버십 기록이 없으므로 DB 변경 없이 종료
    if (user.role === UserRole.ADMIN) {
      return
    }

    const users = (chat.users || []).filter((u) => u.id !== user.id)

    // 마지막 유저가 나가면 채팅방을 소프트 삭제한다
    if (users.length === 0) {
      await this.chatRepository.softDelete(chatId)
      return
    }

    await this.chatRepository.save({ id: chatId, users: users as any })
  }
}
