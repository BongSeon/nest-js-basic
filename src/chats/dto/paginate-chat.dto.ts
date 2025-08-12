import { BasePaginateDto } from 'src/common/dto/base-pagination.dto'
import { IsEnum, IsOptional } from 'class-validator'
import { ChatType } from '../entities/chat.entity'

export class PaginateChatDto extends BasePaginateDto {
  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType
}
