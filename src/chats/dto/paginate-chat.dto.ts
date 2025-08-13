import { BasePaginateDto } from 'src/common/dto/base-pagination.dto'
import { IsBoolean, IsEnum, IsOptional } from 'class-validator'
import { ChatType } from '../entities/chat.entity'

export class PaginateChatDto extends BasePaginateDto {
  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType

  // 내가 속한 채팅방 목록만 조회 여부
  @IsOptional()
  @IsBoolean()
  myChatsOnly?: boolean

  // 안 읽은 개수 포함 조회 여부
  @IsOptional()
  @IsBoolean()
  withUnreadCount?: boolean
}
