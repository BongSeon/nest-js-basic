import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common'
import { ChatsService } from './chats.service'
import { PaginateChatDto } from './dto/paginate-chat.dto'
import { AccessTokenGuard } from 'src/auth/guards/bearer-token.guard'
import { User } from 'src/users/decorator/user.decorator'

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  paginateChats(@Query() dto: PaginateChatDto) {
    return this.chatsService.paginateChats(dto)
  }

  @Get(':id')
  getChatById(@Param('id') id: string) {
    return this.chatsService.getChatById(+id)
  }

  @UseGuards(AccessTokenGuard)
  @Post(':id/join')
  joinChat(@Param('id') id: string, @User('id') userId: number) {
    return this.chatsService.joinChat(+id, userId)
  }

  @UseGuards(AccessTokenGuard)
  @Delete(':id/exit')
  async exitChat(@Param('id') id: string, @User('id') userId: number) {
    await this.chatsService.exitChat(+id, userId)
    return { success: true }
  }
}
