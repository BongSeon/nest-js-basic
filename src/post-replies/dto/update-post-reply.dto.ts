import { PartialType } from '@nestjs/mapped-types'
import { CreatePostReplyDto } from './create-post-reply.dto'

export class UpdatePostReplyDto extends PartialType(CreatePostReplyDto) {}
