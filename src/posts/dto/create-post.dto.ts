import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator'

export class CreatePostDto {
  @IsString({
    message: 'title은 string타입이어야 합니다.',
  })
  @IsNotEmpty({
    message: 'title은 필수 값입니다.',
  })
  @MinLength(2, {
    message: 'title은 최소 2자 이상이어야 합니다.',
  })
  @MaxLength(100, {
    message: 'title은 최대 100자 이하이어야 합니다.',
  })
  title: string

  @IsString({
    message: 'content는 string타입이어야 합니다.',
  })
  @IsNotEmpty({
    message: 'content는 필수 값입니다.',
  })
  @MinLength(10, {
    message: 'content는 최소 10자 이상이어야 합니다.',
  })
  @MaxLength(1000, {
    message: 'content는 최대 1000자 이하이어야 합니다.',
  })
  content: string
}
