import { IsNumber, IsString, MaxLength } from 'class-validator'

export class CreateMessageDto {
  @IsNumber()
  chatId: number

  @IsString()
  @MaxLength(100)
  content: string
}
