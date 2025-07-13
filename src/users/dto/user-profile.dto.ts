import { PickType } from '@nestjs/mapped-types'
import { BaseUserDto } from './base-user.dto'

export class UserProfileDto extends PickType(BaseUserDto, [
  'username',
  'email',
  'nickname',
] as const) {}
