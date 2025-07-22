import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class BasePaginateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  where__id__less_than?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  where__id__greater_than?: number

  @IsOptional()
  @IsString()
  order__createdAt?: 'ASC' | 'DESC'
}
