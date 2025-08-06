import { IsArray, IsNumber } from 'class-validator'

export class CreateChatDto {
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[]
}
