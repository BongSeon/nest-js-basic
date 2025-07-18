import { UserRole } from '../entities/user.entity'

export interface UserPayload {
  id: number
  username: string
  role: UserRole
}
