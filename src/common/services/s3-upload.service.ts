import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as crypto from 'crypto'
import {
  ENV_AWS_ACCESS_KEY_ID_KEY,
  ENV_AWS_SECRET_ACCESS_KEY_KEY,
  ENV_AWS_REGION_KEY,
  ENV_AWS_S3_BUCKET_NAME_KEY,
  ENV_AWS_S3_BUCKET_URL_KEY,
} from '../const/env-keys.const'
import {
  S3_IMAGES_PATH,
  S3_PROFILE_IMAGE_PATH,
  S3_POST_IMAGE_PATH,
  S3_TEMP_IMAGE_PATH,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_FILE_SIZE,
} from '../const/path.const'

@Injectable()
export class S3UploadService {
  private s3Client: S3Client
  private bucketName: string
  private bucketUrl: string

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>(ENV_AWS_S3_BUCKET_NAME_KEY)
    this.bucketUrl = this.configService.get<string>(ENV_AWS_S3_BUCKET_URL_KEY)

    // 환경변수 디버깅을 위한 로그
    console.log('S3 Configuration:', {
      bucketName: this.bucketName,
      bucketUrl: this.bucketUrl,
      region: this.configService.get<string>(ENV_AWS_REGION_KEY),
      accessKeyId: this.configService.get<string>(ENV_AWS_ACCESS_KEY_ID_KEY)
        ? 'SET'
        : 'NOT_SET',
      secretAccessKey: this.configService.get<string>(
        ENV_AWS_SECRET_ACCESS_KEY_KEY
      )
        ? 'SET'
        : 'NOT_SET',
    })

    // 필수 환경변수 검증
    if (!this.bucketName) {
      throw new Error(
        `S3 bucket name is not configured. Please set ${ENV_AWS_S3_BUCKET_NAME_KEY} in your environment.`
      )
    }

    if (!this.configService.get<string>(ENV_AWS_REGION_KEY)) {
      throw new Error(
        `AWS region is not configured. Please set ${ENV_AWS_REGION_KEY} in your environment.`
      )
    }

    if (!this.configService.get<string>(ENV_AWS_ACCESS_KEY_ID_KEY)) {
      throw new Error(
        `AWS access key ID is not configured. Please set ${ENV_AWS_ACCESS_KEY_ID_KEY} in your environment.`
      )
    }

    if (!this.configService.get<string>(ENV_AWS_SECRET_ACCESS_KEY_KEY)) {
      throw new Error(
        `AWS secret access key is not configured. Please set ${ENV_AWS_SECRET_ACCESS_KEY_KEY} in your environment.`
      )
    }

    this.s3Client = new S3Client({
      region: this.configService.get<string>(ENV_AWS_REGION_KEY),
      credentials: {
        accessKeyId: this.configService.get<string>(ENV_AWS_ACCESS_KEY_ID_KEY),
        secretAccessKey: this.configService.get<string>(
          ENV_AWS_SECRET_ACCESS_KEY_KEY
        ),
      },
    })
  }

  /**
   * 파일 유효성 검사
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.')
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`
      )
    }

    const fileExtension = this.getFileExtension(file.originalname)
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension.toLowerCase())) {
      throw new BadRequestException('지원하지 않는 파일 형식입니다.')
    }
  }

  /**
   * 파일 확장자 추출
   */
  private getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'))
  }

  /**
   * 고유한 파일명 생성
   */
  private generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now()
    const randomString = crypto.randomBytes(8).toString('hex')
    const extension = this.getFileExtension(originalName)
    return `${timestamp}-${randomString}${extension}`
  }

  /**
   * S3 키 생성
   */
  private generateS3Key(folder: string, fileName: string): string {
    return `${S3_IMAGES_PATH}/${folder}/${fileName}`
  }

  /**
   * 이미지 업로드
   */
  async uploadImage(
    file: Express.Multer.File,
    path: string = S3_TEMP_IMAGE_PATH
  ): Promise<{ url: string; key: string }> {
    this.validateFile(file)

    const uniqueFileName = this.generateUniqueFileName(file.originalname)
    const s3Key = this.generateS3Key(path, uniqueFileName)

    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    })

    try {
      await this.s3Client.send(uploadCommand)

      const imageUrl = `${this.bucketUrl}/${s3Key}`

      return {
        url: imageUrl,
        key: `/${s3Key}`,
      }
    } catch (error) {
      console.error('S3 Upload Error:', {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        bucketName: this.bucketName,
        s3Key: s3Key,
        fileSize: file.size,
        contentType: file.mimetype,
      })
      throw new BadRequestException(
        `이미지 업로드에 실패했습니다: ${error.message}`
      )
    }
  }

  /**
   * 이미지 삭제
   */
  async deleteImage(s3Key: string): Promise<void> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    })

    try {
      await this.s3Client.send(deleteCommand)
    } catch (error) {
      throw new BadRequestException('이미지 삭제에 실패했습니다.', error)
    }
  }

  /**
   * 이미지 이동 (temp에서 posts로)
   */
  async moveImageFromTempToPosts(
    tempUrl: string
  ): Promise<{ url: string; key: string }> {
    console.log('Moving image from temp to posts:', { tempUrl })

    // tempUrl에서 키 추출 (예: "/images/temp/filename.png" -> "images/temp/filename.png")
    const tempKey = tempUrl.startsWith('/') ? tempUrl.substring(1) : tempUrl

    // 새로운 키 생성 (temp -> posts)
    const fileName = tempKey.split('/').pop() // filename.png
    const newKey = `${S3_IMAGES_PATH}/${S3_POST_IMAGE_PATH}/${fileName}`

    const copyCommand = new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${tempKey}`,
      Key: newKey,
      ACL: 'public-read',
    })

    try {
      await this.s3Client.send(copyCommand)

      // 원본 파일 삭제
      await this.deleteImage(tempKey)

      const newUrl = `${this.bucketUrl}/${newKey}`
      // console.log('result:', { newUrl, newKey })

      return {
        url: newUrl,
        key: newKey,
      }
    } catch (error) {
      console.error('S3 Move Error:', {
        error: error.message,
        tempKey,
        newKey,
        bucketName: this.bucketName,
        copySource: `${this.bucketName}/${tempKey}`,
      })
      throw new BadRequestException(
        `이미지 이동에 실패했습니다: ${error.message}`
      )
    }
  }

  /**
   * 업로드용 서명된 URL 생성 (클라이언트에서 직접 업로드할 때 사용)
   */
  async generatePresignedUrl(
    fileName: string,
    folder: 'profile' | 'posts' = 'posts',
    contentType: string
  ): Promise<{ url: string; key: string }> {
    const uniqueFileName = this.generateUniqueFileName(fileName)
    const s3Key = this.generateS3Key(
      folder === 'profile' ? S3_PROFILE_IMAGE_PATH : S3_POST_IMAGE_PATH,
      uniqueFileName
    )

    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: contentType,
      ACL: 'public-read',
    })

    try {
      const presignedUrl = await getSignedUrl(this.s3Client, uploadCommand, {
        expiresIn: 3600, // 1시간
      })

      return {
        url: presignedUrl,
        key: s3Key,
      }
    } catch (error) {
      throw new BadRequestException('서명된 URL 생성에 실패했습니다. ', error)
    }
  }
}
