import { UserRole } from '../../users/entities/user.entity'

export interface JwtPayload {
  username: string
  sub: number
  role: UserRole
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}
