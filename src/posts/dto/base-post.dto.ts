import {
  IsString,
  IsNotEmpty,
  Length,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator'
import { PostType } from '../entities/post.entity'

export class BasePostDto {
  @IsString({
    message: 'title은 string타입이어야 합니다.',
  })
  @IsOptional()
  @Length(2, 100, {
    message: 'title은 2자 이상 100자 이하여야 합니다.',
  })
  title?: string

  @IsString({
    message: 'content는 string타입이어야 합니다.',
  })
  @IsNotEmpty({
    message: 'content는 필수 값입니다.',
  })
  @Length(4, 1000, {
    message: 'content는 4자 이상 1000자 이하여야 합니다.',
  })
  content: string

  @IsEnum(PostType, {
    message: 'type은 올바른 게시글 타입이어야 합니다.',
  })
  @IsOptional()
  type?: PostType

  @IsNumber()
  userId: number
}
