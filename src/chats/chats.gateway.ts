import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { CreateChatDto } from './dto/create-chat.dto'
import { ChatsService } from './chats.service'

@WebSocketGateway({
  // ws://localhost:3000/chats
  namespace: 'chats',
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatsService: ChatsService) {}

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
  enterChat(
    // 방(chat)의 id들을 리스트로 받는다.
    @MessageBody() chatIds: number[],
    @ConnectedSocket() socket: Socket
  ) {
    for (const chatId of chatIds) {
      socket.join(chatId.toString())
    }
  }

  @SubscribeMessage('sendMessage')
  sendMessage(
    @MessageBody() message: { message: string; chatId: number },
    @ConnectedSocket() socket: Socket
  ) {
    // 1. 방에 있는 모두에게 보내는 방식
    // this.server
    //   .in(message.chatId.toString())
    //   .emit('receiveMessage', message.message)

    // 2. 나를 제외한 모두에게 보내는 방식
    socket.to(message.chatId.toString()).emit('receiveMessage', message.message)
  }

  handleDisconnect(socket: Socket) {
    console.log('Client disconnected: ', socket.id)
  }
}
