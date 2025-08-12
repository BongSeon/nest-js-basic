import {
  Body,
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
import { CreateChatDto } from './dto/create-chat.dto'
import { ChatType } from './entities/chat.entity'

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  paginateChats(@Query() dto: PaginateChatDto) {
    return this.chatsService.paginateChats(dto)
  }

  @Get('/support')
  @UseGuards(AccessTokenGuard)
  paginateSupportChats(@User() user: UserPayload) {
    return this.chatsService.paginateChats({ type: ChatType.SUPPORT }, user.id)
  }

  @Get(':id')
  getChatById(@Param('id') id: string) {
    return this.chatsService.getChatById(+id)
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  createChat(@Body() dto: CreateChatDto, @User() user: UserPayload) {
    return this.chatsService.createChat(dto, user.id)
  }

  @Post(':id/join')
  @UseGuards(AccessTokenGuard)
  joinChat(@Param('id', ParseIntPipe) id: number, @User() user: UserPayload) {
    return this.chatsService.joinChat(id, user)
  }

  @Delete(':id/exit')
  @UseGuards(AccessTokenGuard)
  async exitChat(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserPayload
  ) {
    await this.chatsService.exitChat(id, user)
    return { success: true }
  }
}
