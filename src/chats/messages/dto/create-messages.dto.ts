import { IsNumber } from 'class-validator'
import { PickType } from '@nestjs/mapped-types'
import { Message } from '../entities/message.entity'

export class CreateMessageDto extends PickType(Message, ['content']) {
  @IsNumber()
  chatId: number
}
