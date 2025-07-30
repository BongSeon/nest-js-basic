import { IsOptional, IsEnum, IsString } from 'class-validator'
import { BasePaginateDto } from 'src/common/dto/base-pagination.dto'
import { UserRole } from '../entities/user.entity'

export class GetUsersDto extends BasePaginateDto {
  @IsOptional()
  @IsEnum(UserRole)
  where__role__equal?: UserRole

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  or_where__username__i_like?: string

  @IsOptional()
  @IsString()
  or_where__nickname__i_like?: string

  @IsOptional()
  @IsString()
  or_where__email__i_like?: string
}
