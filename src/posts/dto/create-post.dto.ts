import { PickType } from '@nestjs/mapped-types'
import { BasePostDto } from './base-post.dto'

export class CreatePostDto extends PickType(BasePostDto, [
  'title',
  'content',
] as const) {}
