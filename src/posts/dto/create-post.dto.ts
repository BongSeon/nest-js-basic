import { PickType, PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsString } from 'class-validator'
import { BasePostDto } from './base-post.dto'

export class CreatePostDto extends PartialType(
  PickType(BasePostDto, ['title', 'content'] as const)
) {
  @IsOptional()
  @IsString()
  imageUrl?: string
}
