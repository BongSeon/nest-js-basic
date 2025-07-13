import { PartialType, PickType } from '@nestjs/mapped-types'
import { BaseUserDto } from './base-user.dto'

export class UpdateUserDto extends PartialType(
  PickType(BaseUserDto, ['username', 'email', 'nickname', 'password'] as const)
) {}
