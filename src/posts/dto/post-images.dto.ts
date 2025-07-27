import { IsArray, IsString, IsOptional } from 'class-validator'

export class PostImagesDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  kept?: string[] = []

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  added?: string[] = []
}
