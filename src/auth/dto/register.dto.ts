import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator'

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  username: string

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nickname: string

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(100)
  password: string
}
