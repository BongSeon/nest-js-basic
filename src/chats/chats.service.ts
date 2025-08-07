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
        relations: ['users'],
      },
      'chats'
    )
  }

  async createChat(dto: CreateChatDto) {
    const chat = await this.chatRepository.save({
      // 채팅방 생성 시 채팅방에 참여하는 유저들을 저장한다.
      // [{id: 1}, {id: 2}]
      users: dto.userIds.map((id) => ({ id })),
    })

    return this.chatRepository.findOne({
      where: { id: chat.id },
    })
  }

  async checkIfChatExists(chatId: number) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    })

    return !!chat
  }
}
