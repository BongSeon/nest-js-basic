import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Query,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AccessTokenGuard } from '../../auth/guards/bearer-token.guard'
import { S3UploadService } from '../services/s3-upload.service'
import { S3_TEMP_IMAGE_PATH } from '../const/path.const'

@Controller('upload')
export class UploadController {
  constructor(private readonly s3UploadService: S3UploadService) {}

  /**
   * 이미지 업로드
   */
  @Post('image')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = S3_TEMP_IMAGE_PATH
  ) {
    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.')
    }

    const result = await this.s3UploadService.uploadImage(file, folder)

    return {
      message: '이미지 업로드가 완료되었습니다.',
      data: result,
    }
  }

  /**
   * 서명된 URL 생성 (클라이언트에서 직접 업로드할 때 사용)
   */
  @Post('presigned-url')
  @UseGuards(AccessTokenGuard)
  async generatePresignedUrl(
    @Query('fileName') fileName: string,
    @Query('folder') folder: 'profile' | 'posts' = 'posts',
    @Query('contentType') contentType: string
  ) {
    if (!fileName) {
      throw new BadRequestException('파일명이 필요합니다.')
    }

    if (!contentType) {
      throw new BadRequestException('Content-Type이 필요합니다.')
    }

    const result = await this.s3UploadService.generatePresignedUrl(
      fileName,
      folder,
      contentType
    )

    return {
      message: '서명된 URL이 생성되었습니다.',
      data: result,
    }
  }
}
