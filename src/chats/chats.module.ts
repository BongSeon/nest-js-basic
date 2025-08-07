import { Module } from '@nestjs/common'
import { CommonService } from 'src/common/services/common.service'
import { ChatsService } from './chats.service'
import { ChatMessagesService } from './messages/messages.service'
import { ChatsController } from './chats.controller'
import { ChatsGateway } from './chats.gateway'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Chat } from './entities/chat.entity'
import { Message } from './messages/entities/message.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Chat, Message])],
  controllers: [ChatsController],
  providers: [ChatsGateway, ChatsService, CommonService, ChatMessagesService],
})
export class ChatsModule {}
