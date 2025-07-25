import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { Image } from '../entities/image.entity'
import { CreatePostImageDto } from 'src/posts/image/dto/create-image.dto'
import { S3UploadService } from './s3-upload.service'

@Injectable()
export class ImagesService {
  constructor(
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>,
    private s3UploadService: S3UploadService
  ) {}

  getRepository(qr?: QueryRunner) {
    return qr ? qr.manager.getRepository<Image>(Image) : this.imagesRepository
  }

  async createPostImage(
    dto: CreatePostImageDto,
    qr?: QueryRunner
  ): Promise<any> {
    const repository = this.getRepository(qr)

    // 이미지 URL이 있는 경우 temp에서 posts로 이동
    let finalImageUrl = dto.path
    console.log('Creating post with imageUrl:', dto.path)

    // 이미지 레포지토리에 저장
    const result = await repository.save({ ...dto })

    // 파일 옮기기
    if (dto.path) {
      console.log('Image URL contains temp path, moving to posts...')
      try {
        const movedImage = await this.s3UploadService.moveImageFromTempToPosts(
          dto.path
        )
        finalImageUrl = movedImage.url
        console.log('Image moved successfully, new URL:', finalImageUrl)
      } catch (error) {
        console.error('Failed to move image:', error)
        throw new BadRequestException(
          `이미지 이동에 실패했습니다: ${error.message}`
        )
      }
    } else {
      console.log('No temp image to move or imageUrl is null')
    }

    return result
  }
}
