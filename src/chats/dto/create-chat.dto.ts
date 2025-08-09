import {
  IsArray,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator'
import { ChatType } from '../entities/chat.entity'

export class CreateChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string

  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType = ChatType.PRIVATE

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  userIds?: number[]
}
