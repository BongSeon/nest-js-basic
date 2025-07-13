import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  namespace: '/landing',
  cors: {
    origin: '*',
  },
})
export class LandingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server

  handleConnection(client: Socket) {
    console.log(`클라이언트 연결됨: ${client.id}`)

    // 해당 클라이언트에만 메시지 전송
    client.emit('onConnected', {
      clientId: client.id,
      message: '안녕하세요',
    })
  }

  handleDisconnect(client: Socket) {
    console.log(`클라이언트 연결 해제됨: ${client.id}`)
  }
}
