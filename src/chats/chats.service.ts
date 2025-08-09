import { Chat } from './entities/chat.entity'
import { CommonService } from 'src/common/services/common.service'
import { Injectable } from '@nestjs/common'
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

  async checkIfChatExists(chatId: number) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    })

    return !!chat
  }
}
