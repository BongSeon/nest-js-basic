import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator'

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  username: string

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(100)
  password: string
}
