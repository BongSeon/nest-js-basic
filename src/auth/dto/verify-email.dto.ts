import { IsString, IsEmail, Length } from 'class-validator'

export class VerifyEmailDto {
  @IsEmail()
  email: string

  @IsString()
  @Length(6, 6)
  verificationCode: string
}
