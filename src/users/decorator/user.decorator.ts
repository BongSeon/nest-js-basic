import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common'
import { UserPayload } from '../types/user-payload.interface'
import { JwtPayload } from 'src/auth/types/jwt-payload.interface'

export const User = createParamDecorator(
  (data: keyof UserPayload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()

    const payload = request['user'] as JwtPayload
    const user: UserPayload = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    }

    if (!user) {
      throw new InternalServerErrorException(
        'User 데코레이터는 AccessTokenGuard와 함께 사용되어야 합니다.'
      )
    }

    return data ? user[data] : user
  }
)
