import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { ChatsService } from './chats.service'
import { PaginateChatDto } from './dto/paginate-chat.dto'
import { AccessTokenGuard } from 'src/auth/guards/bearer-token.guard'
import { User } from 'src/users/decorator/user.decorator'
import { UserPayload } from 'src/users/types/user-payload.interface'

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
  joinChat(@Param('id', ParseIntPipe) id: number, @User() user: UserPayload) {
    return this.chatsService.joinChat(id, user)
  }

  @UseGuards(AccessTokenGuard)
  @Delete(':id/exit')
  async exitChat(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserPayload
  ) {
    await this.chatsService.exitChat(id, user)
    return { success: true }
  }
}
