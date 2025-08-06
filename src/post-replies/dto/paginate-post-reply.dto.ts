import { IsOptional, IsNumber } from 'class-validator'
import { Transform } from 'class-transformer'
import { BasePaginateDto } from '../../common/dto/base-pagination.dto'

export class PaginatePostReplyDto extends BasePaginateDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  postId?: number
}
