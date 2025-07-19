import { IsString, IsNotEmpty, IsEnum } from 'class-validator'
import { ImageType } from 'src/common/entities/image.entity'

/**
 * 프로필 이미지와 커버 이미지 업데이트 DTO
 */
export class UpdateProfileImageDto {
  @IsString()
  @IsNotEmpty()
  image: string

  @IsEnum(ImageType)
  @IsNotEmpty()
  type: ImageType
}
