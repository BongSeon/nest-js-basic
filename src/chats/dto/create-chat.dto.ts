import { IsArray, IsNumber, IsOptional, IsEnum } from 'class-validator'
import { ChatType } from '../entities/chat.entity'

export class CreateChatDto {
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[]

  @IsNumber()
  ownerId: number

  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType = ChatType.PRIVATE
}
