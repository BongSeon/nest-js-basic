import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsNumber,
} from 'class-validator'

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  title?: string

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(1000)
  content?: string

  @IsNumber()
  @IsOptional()
  userId?: number
}
