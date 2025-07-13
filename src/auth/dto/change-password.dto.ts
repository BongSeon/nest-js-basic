import { PickType } from '@nestjs/mapped-types'
import { BaseUserDto } from '../../users/dto/base-user.dto'

export class ChangePasswordDto extends PickType(BaseUserDto, [
  'password',
] as const) {}
