import { PickType, PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsString, IsEnum } from 'class-validator'
import { BasePostDto } from './base-post.dto'
import { PostType } from '../entities/post.entity'
import { TitleRequiredForType } from './validators/title-required-for-type.validator'

export class CreatePostDto extends PartialType(
  PickType(BasePostDto, ['content'] as const)
) {
  @IsString({
    message: 'title은 string타입이어야 합니다.',
  })
  @IsOptional()
  @TitleRequiredForType()
  title?: string

  @IsEnum(PostType, {
    message: 'type은 올바른 게시글 타입이어야 합니다.',
  })
  @IsOptional()
  type: PostType = PostType.USER

  @IsString({ each: true })
  @IsOptional()
  images: string[] = []
}
