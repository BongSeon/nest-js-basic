import { IsString, IsNotEmpty } from 'class-validator'

export class CreatePostReplyDto {
  @IsString()
  @IsNotEmpty({
    message: 'content는 필수 입력 항목입니다.',
  })
  content: string
}
