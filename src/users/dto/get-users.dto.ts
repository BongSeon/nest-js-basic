import { BasePaginateDto } from 'src/common/dto/base-pagination.dto'
import { UserRole } from '../entities/user.entity'

export class GetUsersDto extends BasePaginateDto {
  where__User_role__equal: UserRole
}
