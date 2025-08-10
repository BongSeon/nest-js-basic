import { Chat, ChatType } from './entities/chat.entity'
import { CommonService } from 'src/common/services/common.service'
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateChatDto } from './dto/create-chat.dto'
import { PaginateChatDto } from './dto/paginate-chat.dto'

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    private readonly commonService: CommonService
  ) {}

  paginateChats(dto: PaginateChatDto) {
    return this.commonService.paginate(
      dto,
      this.chatRepository,
      {
        relations: ['users', 'users.profile', 'owner', 'owner.profile'],
      },
      'chats'
    )
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

  async joinChat(chatId: number, userId: number) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['users', 'owner'],
    })

    if (!chat) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.')
    }

    // private 방은 개설자만 추가 가능하도록 제한 (단순 정책)
    if (chat.type === ChatType.PRIVATE && chat.owner?.id !== userId) {
      throw new ForbiddenException(
        '비공개 채팅방은 개설자만 멤버를 추가할 수 있습니다.'
      )
    }

    const alreadyMember = chat.users?.some((u) => u.id === userId)
    if (alreadyMember) {
      return this.getChatById(chatId)
    }

    const updated = await this.chatRepository.save({
      id: chatId,
      users: [...(chat.users || []), { id: userId } as any],
    })

    return this.getChatById(updated.id)
  }

  async exitChat(chatId: number, userId: number) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['users'],
    })

    if (!chat) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.')
    }

    const users = (chat.users || []).filter((u) => u.id !== userId)
    await this.chatRepository.save({ id: chatId, users: users as any })
  }
}
