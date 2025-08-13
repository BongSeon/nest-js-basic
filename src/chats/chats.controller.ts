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

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // 채팅방 목록 조회 (안 읽은 개수 없이 조회)
  @Get('/without-unread-count')
  paginateChats(@Query() dto: PaginateChatDto) {
    return this.chatsService.paginateChats(dto)
  }

  // 채팅방 목록 조회
  @Get()
  @UseGuards(AccessTokenGuard)
  paginateMyChats(@Query() dto: PaginateChatDto, @User() user: UserPayload) {
    return this.chatsService.paginateChats(dto, user.id)
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  getChatById(@Param('id') id: string, @User() user: UserPayload) {
    // 상세 조회 시 마지막 읽음 갱신
    this.chatsService.markChatRead(+id, user.id).catch(() => {})
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
