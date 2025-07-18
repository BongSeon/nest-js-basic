import {
  IsString,
  IsNotEmpty,
  IsEmail,
  Length,
  IsEnum,
  IsOptional,
} from 'class-validator'
import { UserRole } from '../entities/user.entity'

export class BaseUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50, {
    message: 'username은 3자 이상 50자 이하여야 합니다.',
  })
  username: string

  @IsEmail()
  @IsNotEmpty()
  email: string

  @IsString()
  @IsNotEmpty()
  @Length(2, 100, {
    message: 'nickname은 2자 이상 100자 이하여야 합니다.',
  })
  nickname: string

  @IsString()
  @IsNotEmpty()
  @Length(4, 100, {
    message: 'password은 4자 이상 100자 이하여야 합니다.',
  })
  password: string

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole
}
