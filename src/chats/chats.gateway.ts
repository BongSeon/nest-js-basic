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
import { CreateChatDto } from './dto/create-chat.dto'
import { ChatsService } from './chats.service'
import { EnterChatDto } from './dto/enter-chat.dto'
import { CreateMessageDto } from './messages/dto/create-messages.dto'
import { MessagesService } from './messages/messages.service'

@WebSocketGateway({
  // ws://localhost:3000/chats
  namespace: 'chats',
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService
  ) {}

  @WebSocketServer()
  server: Server // this.server.emit('receiveMessage', message) 모든 클라이언트에게 메시지 전송

  handleConnection(socket: Socket) {
    console.log('Client connected: ', socket.id)
  }

  @SubscribeMessage('createChat')
  async createChat(
    @MessageBody() dto: CreateChatDto,
    @ConnectedSocket() socket: Socket
  ) {
    const chat = await this.chatsService.createChat(dto)

    socket.emit('onCreatedChat', chat)
  }

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
  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody() dto: CreateMessageDto,
    @ConnectedSocket() socket: Socket
  ) {
    const chatExists = await this.chatsService.checkIfChatExists(dto.chatId)
    if (!chatExists) {
      throw new WsException({
        code: 100,
        message: `존재하지 않는 채팅방입니다. chatId: ${dto.chatId}`,
      })
    }

    const message = await this.messagesService.createMessage(dto)

    // 나를 제외한 모두에게 보내는 방식
    console.log('chatId: ', message.chat.id)
    socket.to(message.chat.id.toString()).emit('receiveMessage', dto.content)
  }

  handleDisconnect(socket: Socket) {
    console.log('Client disconnected: ', socket.id)
  }
}
