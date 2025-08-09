import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, Repository } from 'typeorm'
import { Message } from './entities/message.entity'
import { Chat } from '../entities/chat.entity'
import { PaginateMessageDto } from './dto/paginate-message.dto'
import { CommonService } from 'src/common/services/common.service'
import { CreateMessageDto } from './dto/create-messages.dto'
import { plainToClass } from 'class-transformer'

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(Chat)
    private readonly chatsRepository: Repository<Chat>,
    private readonly commonService: CommonService
  ) {}

  async createMessage(dto: CreateMessageDto, userId: number) {
    const message = await this.messagesRepository.save({
      chat: { id: dto.chatId },
      user: { id: userId },
      content: dto.content,
    })

    const result = await this.messagesRepository.findOne({
      where: { id: message.id },
      relations: ['chat', 'user', 'user.profile'],
    })

    return plainToClass(Message, result)
  }

  paginateMessages(
    dto: PaginateMessageDto,
    overrides: FindManyOptions<Message>,
    chatId?: number
  ) {
    return this.commonService.paginate(
      dto,
      this.messagesRepository,
      overrides,
      chatId ? `chats/${chatId}/messages` : null
    )
  }
}
