import { IsArray, IsNumber } from 'class-validator'

export class EnterChatDto {
  @IsArray()
  @IsNumber({}, { each: true })
  chatIds: number[]
}
