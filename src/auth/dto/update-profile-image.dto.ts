import { IsString, IsNotEmpty } from 'class-validator'

export class UpdateProfileImageDto {
  @IsString()
  @IsNotEmpty()
  image: string
}
