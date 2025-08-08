import { IsArray, IsNumber, IsOptional, IsEnum } from 'class-validator'
import { ChatType } from '../entities/chat.entity'

export class CreateChatDto {
  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType = ChatType.PRIVATE

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  userIds?: number[]
}
