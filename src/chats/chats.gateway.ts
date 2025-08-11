import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { AuthService } from 'src/auth/auth.service'
import { UsersService } from 'src/users/users.service'
import { ChatsService } from './chats.service'
import { CreateMessageDto } from './messages/dto/create-messages.dto'
import { MessagesService } from './messages/messages.service'
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common'
import { SocketCatchHttpFilter } from 'src/common/filters/socket-catch-http.filter'
import { User, UserRole } from 'src/users/entities/user.entity'
import { CreateChatDto } from './dto/create-chat.dto'
import { EnterChatDto } from './dto/enter-chat.dto'
import { LeaveChatDto } from './dto/leave-chat.dto'

@WebSocketGateway({
  // ws://localhost:3000/chats
  namespace: 'chats',
  cors: {
    origin: '*',
  },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {}

  @WebSocketServer()
  server: Server
  async handleConnection(socket: Socket & { user: User }) {
    try {
      const headers = socket.handshake.headers

      // Bearer <token>
      const rawToken = headers['authorization'] || socket.handshake.auth?.token
      if (!rawToken) {
        console.log('토큰이 없습니다.')
        socket.disconnect()
        return
      }

      const tokenType = 'Bearer'

      const token = rawToken.startsWith(tokenType + ' ')
        ? rawToken.substring(tokenType.length + 1)
        : null

      if (!token) {
        socket.disconnect()
        return
      }

      const payload: any = await this.authService.verifyToken(token)
      const user = await this.usersService.findOne(payload.sub)
      socket.user = user
      // id, username 출력
      console.log('Client connected: ', user.id, user.username)
      // 해당 클라이언트에만 메시지 전송
      socket.emit('onConnected', {
        message: `${user.username}님이 챗서비스에 접속했습니다`,
      })

      // ADMIN: 모든 방에 자동 조인, 일반 사용자: 멤버인 방에 자동 조인
      try {
        const chatIds =
          user.role === UserRole.ADMIN
            ? await this.chatsService.getAllChatIds()
            : await this.chatsService.getUserChatIds(user.id)
        if (chatIds.length > 0) {
          socket.join(chatIds.map((id) => id.toString()))
        }
      } catch {
        // 조용히 무시: 자동 조인이 실패해도 연결은 유지
      }
    } catch (error) {
      console.log(`토큰이 유효하지 않습니다. ${error.message}`)
      socket.disconnect()
    }
  }

  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  )
  @UseFilters(SocketCatchHttpFilter)
  @SubscribeMessage('createChat')
  async createChat(
    @MessageBody() dto: CreateChatDto,
    @ConnectedSocket() socket: Socket & { user: User }
  ) {
    const chat = await this.chatsService.createChat(dto, socket.user.id)

    socket.emit('onCreatedChat', chat)
  }

  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  )
  @UseFilters(SocketCatchHttpFilter)
  @SubscribeMessage('enterChat')
  async enterChat(
    // 방(chat)의 id들을 리스트로 받는다.
    @MessageBody() dto: EnterChatDto,
    @ConnectedSocket() socket: Socket & { user: User }
  ) {
    const exists = await this.chatsService.checkIfChatExists(dto.chatId)
    if (!exists) {
      throw new WsException({
        code: 100,
        message: `존재하지 않는 채팅방입니다. chatId: ${dto.chatId}`,
      })
    }

    const chat = await this.chatsService.getChatById(dto.chatId)
    const isMember = await this.chatsService.isMember(
      dto.chatId,
      socket.user.id
    )
    const isAdmin = socket.user.role === UserRole.ADMIN
    const canJoin = isAdmin || isMember || chat.type === 'public'
    if (!canJoin) {
      throw new WsException({
        code: 403,
        message: `채팅방 입장 권한이 없습니다. chatId: ${dto.chatId}`,
      })
    }

    socket.join(dto.chatId.toString())

    // 입장 확인 메시지 전송
    socket.emit('onEnteredChat', {
      message: `채팅방에 입장했습니다. chatId: ${dto.chatId}`,
    })
  }

  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  )
  @UseFilters(SocketCatchHttpFilter)
  @SubscribeMessage('leaveChat')
  async leaveChat(
    @MessageBody() dto: LeaveChatDto,
    @ConnectedSocket() socket: Socket & { user: User }
  ) {
    const exists = await this.chatsService.checkIfChatExists(dto.chatId)
    if (!exists) {
      throw new WsException({
        code: 100,
        message: `존재하지 않는 채팅방입니다. chatId: ${dto.chatId}`,
      })
    }

    socket.leave(dto.chatId.toString())

    // 나가기 확인 메시지 전송
    socket.emit('onLeftChat', {
      message: `채팅방에서 떠났습니다. chatId: ${dto.chatId}`,
    })
  }

  /**
   * 참고 사항
   * 1. 방에 있는 모두에게 보내는 방식
   * this.server
   *   .in(message.chatId.toString())
   *   .emit('onMessage', message.message)
   * 2. 나를 제외한 모두에게 보내는 방식
   * socket.to(dto.chatId.toString()).emit('onMessage', dto.content)
   */
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  )
  @UseFilters(SocketCatchHttpFilter)
  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody() dto: CreateMessageDto,
    @ConnectedSocket() socket: Socket & { user: User }
  ) {
    const chatExists = await this.chatsService.checkIfChatExists(dto.chatId)
    if (!chatExists) {
      throw new WsException({
        code: 100,
        message: `존재하지 않는 채팅방입니다. chatId: ${dto.chatId}`,
      })
    }

    const message = await this.messagesService.createMessage(
      dto,
      socket.user.id
    )

    type OnMessageResponse = {
      id: number
      content: string
      createdAt: Date
      user: User
      chatId: number
    }
    const response: OnMessageResponse = {
      id: message.id,
      content: message.content,
      chatId: message.chat.id,
      user: message.user,
      createdAt: message.createdAt,
    }

    // 방에 있는 모든 사용자에게 메시지 전송 (자신 포함)
    this.server.in(message.chat.id.toString()).emit('onMessage', response)
  }

  handleDisconnect(socket: Socket) {
    console.log('Client disconnected: ', socket.id)
  }
}
