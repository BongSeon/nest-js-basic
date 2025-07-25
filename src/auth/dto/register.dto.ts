import { PickType } from '@nestjs/mapped-types'
import { BaseUserDto } from '../../users/dto/base-user.dto'

export class RegisterDto extends PickType(BaseUserDto, [
  'email',
  'username',
  'nickname',
  'password',
] as const) {}
