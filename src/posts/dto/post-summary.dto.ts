import { PickType } from '@nestjs/mapped-types'
import { BasePostDto } from './base-post.dto'

export class PostSummaryDto extends PickType(BasePostDto, ['title'] as const) {}
