import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator'

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  username?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  nickname?: string

  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(100)
  password?: string
}
