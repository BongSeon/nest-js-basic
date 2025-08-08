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
import { User } from 'src/users/entities/user.entity'
import { CreateChatDto } from './dto/create-chat.dto'
import { EnterChatDto } from './dto/enter-chat.dto'

@WebSocketGateway({
  // ws://localhost:3000/chats
  namespace: 'chats',
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {}

  @WebSocketServer()
  server: Server // this.server.emit('receiveMessage', message) 모든 클라이언트에게 메시지 전송

  //authorization
  async handleConnection(socket: Socket & { user: User }) {
    try {
      const headers = socket.handshake.headers

      // Bearer <token>
      const rawToken = headers['authorization']
      if (!rawToken) {
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
    @ConnectedSocket() socket: Socket
  ) {
    for (const chatId of dto.chatIds) {
      const exists = await this.chatsService.checkIfChatExists(chatId)
      if (!exists) {
        throw new WsException({
          code: 100,
          message: `존재하지 않는 채팅방입니다. chatId: ${chatId}`,
        })
      }
    }

    socket.join(dto.chatIds.map((id) => id.toString()))
  }

  /**
   * 참고 사항
   * 1. 방에 있는 모두에게 보내는 방식
   * this.server
   *   .in(message.chatId.toString())
   *   .emit('receiveMessage', message.message)
   * 2. 나를 제외한 모두에게 보내는 방식
   * socket.to(dto.chatId.toString()).emit('receiveMessage', dto.content)
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

    // 나를 제외한 모두에게 보내는 방식
    console.log('chatId: ', message.chat.id)
    socket.to(message.chat.id.toString()).emit('receiveMessage', dto.content)
  }

  handleDisconnect(socket: Socket) {
    console.log('Client disconnected: ', socket.id)
  }
}
