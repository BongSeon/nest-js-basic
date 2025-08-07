import { PickType } from '@nestjs/mapped-types'
import { IsNotEmpty, IsNumber } from 'class-validator'
import { Message } from '../entities/message.entity'

export class CreateMessageDto extends PickType(Message, ['content']) {
  @IsNotEmpty()
  @IsNumber()
  chatId: number

  @IsNotEmpty()
  @IsNumber()
  userId: number
}
