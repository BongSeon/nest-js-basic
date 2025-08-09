import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  // UseGuards,
} from '@nestjs/common'
import { MessagesService } from './messages.service'
import { PaginateMessageDto } from './dto/paginate-message.dto'
// import { AccessTokenGuard } from 'src/auth/guards/bearer-token.guard'

@Controller('chats/:cid/messages')
// @UseGuards(AccessTokenGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async paginateMessages(
    @Param('cid', ParseIntPipe) id: number,
    @Query() dto: PaginateMessageDto
  ) {
    return await this.messagesService.paginateMessages(
      dto,
      {
        where: {
          chat: {
            id,
          },
        },
        relations: ['user', 'user.profile'],
      },
      id
    )
  }
}
