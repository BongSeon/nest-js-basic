import { IsNumber } from 'class-validator'

export class LeaveChatDto {
  @IsNumber()
  chatId: number
}
