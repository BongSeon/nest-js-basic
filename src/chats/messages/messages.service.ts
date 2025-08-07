import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, Repository } from 'typeorm'
import { Message } from './entities/message.entity'
import { CommonService } from 'src/common/services/common.service'
import { CreateMessageDto } from './dto/create-messages.dto'
import { BasePaginateDto } from 'src/common/dto/base-pagination.dto'

@Injectable()
export class ChatMessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly commonService: CommonService
  ) {}

  async createMessage(dto: CreateMessageDto) {
    const message = await this.messageRepository.save({
      chat: { id: dto.chatId },
      user: { id: dto.userId },
      content: dto.content,
    })

    return await this.messageRepository.findOne({
      where: { id: message.id },
      relations: ['chat', 'user'],
    })
  }

  paginateMessages(dto: BasePaginateDto, overrides: FindManyOptions<Message>) {
    return this.commonService.paginate(
      dto,
      this.messageRepository,
      overrides,
      'messages'
    )
  }
}
