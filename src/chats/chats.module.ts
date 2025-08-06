import { Module } from '@nestjs/common'
import { CommonService } from 'src/common/services/common.service'
import { ChatsService } from './chats.service'
import { ChatsController } from './chats.controller'
import { ChatsGateway } from './chats.gateway'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Chat } from './entities/chat.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Chat])],
  controllers: [ChatsController],
  providers: [ChatsGateway, ChatsService, CommonService],
})
export class ChatsModule {}
