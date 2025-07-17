import { PickType } from '@nestjs/mapped-types'
import { Image } from 'src/common/entities/image.entity'

export class CreatePostImageDto extends PickType(Image, [
  'post',
  'order',
  'path',
  'type',
]) {}
