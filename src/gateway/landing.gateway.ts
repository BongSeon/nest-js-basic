import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { AuthService } from '../auth/auth.service'
import { User } from '../users/entities/user.entity'

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

  constructor(private authService: AuthService) {}

  // 클라이언트 연결 시 실행 (socket==client)
  async handleConnection(socket: Socket) {
    try {
      // 'Bearer <token>'
      const rawToken = socket.handshake.auth?.token
      // 'Bearer ' 제거
      const authToken = rawToken?.substring(7)

      let user: User | null = null

      if (authToken) {
        try {
          // auth 토큰에서 유저 정보 추출 'Bearer <token>'
          user = await this.authService.getUserFromToken(authToken)
          console.log(`인증된 유저 연결: ${user.username}`)
          // 소켓에 유저 정보 저장
          //
        } catch (error) {
          console.log(`토큰 검증 실패: ${error.message}`)
        }
      }

      // 해당 클라이언트에만 메시지 전송
      socket.emit('onConnected', {
        clientId: socket.id,
        user: user
          ? {
              id: user.id,
              username: user.username,
              email: user.email,
              nickname: user.nickname,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            }
          : null,
        message: '안녕하세요',
      })

      console.log(`클라이언트 연결됨: ${socket.id}`)
    } catch (error) {
      console.error('연결 처리 중 오류:', error)
      socket.emit('onConnected', {
        clientId: socket.id,
        user: null,
        message: '연결 중 오류가 발생했습니다.',
      })
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`클라이언트 연결 해제됨: ${client.id}`)
  }
}
