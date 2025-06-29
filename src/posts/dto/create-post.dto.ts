import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator'

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  title: string

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  content: string
}
