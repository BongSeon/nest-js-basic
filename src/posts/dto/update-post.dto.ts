import { PartialType, PickType } from '@nestjs/mapped-types'
import { BasePostDto } from './base-post.dto'

export class UpdatePostDto extends PartialType(
  PickType(BasePostDto, ['title', 'content', 'userId'] as const)
) {}
