import { Module } from '@nestjs/common'
import { CommonService } from 'src/common/services/common.service'
import { ChatsService } from './chats.service'
import { MessagesService } from './messages/messages.service'
import { MessagesController } from './messages/messages.controller'
import { ChatsController } from './chats.controller'
import { ChatsGateway } from './chats.gateway'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Chat } from './entities/chat.entity'
import { ChatLastRead } from './entities/chat-last-read.entity'
import { Message } from './messages/entities/message.entity'
import { AuthModule } from 'src/auth/auth.module'
import { UsersModule } from 'src/users/users.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message, ChatLastRead]),
    AuthModule,
    UsersModule,
  ],
  controllers: [ChatsController, MessagesController],
  providers: [ChatsGateway, ChatsService, MessagesService, CommonService],
})
export class ChatsModule {}
