import { OmitType } from '@nestjs/mapped-types'
import { BaseUserDto } from './base-user.dto'

export class CreateUserWithoutPasswordDto extends OmitType(BaseUserDto, [
  'password',
] as const) {}
