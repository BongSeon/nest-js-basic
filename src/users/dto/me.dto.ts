import { PickType } from '@nestjs/mapped-types'
import { Expose } from 'class-transformer'
import { User } from '../entities/user.entity'

export class MeDto extends PickType(User, [
  'id',
  'username',
  'email',
  'nickname',
  'isEmailVerified',
  'role',
] as const) {
  @Expose()
  createdAt: Date

  @Expose()
  profile?: string

  @Expose()
  cover?: string
}
