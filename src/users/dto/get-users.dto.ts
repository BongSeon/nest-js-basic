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
}
