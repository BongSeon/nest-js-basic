import { PickType } from '@nestjs/mapped-types'
import { BaseUserDto } from '../../users/dto/base-user.dto'

export class LoginDto extends PickType(BaseUserDto, [
  'username',
  'password',
] as const) {}
