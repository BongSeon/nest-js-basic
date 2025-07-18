import { Column, Entity, ManyToOne, OneToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from './base.entity'
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator'
import {
  S3_POST_IMAGE_PATH,
  S3_PROFILE_IMAGE_PATH,
  S3_IMAGES_PATH,
} from '../const/path.const'
import { Transform } from 'class-transformer'
import { Post } from '../../posts/entities/post.entity'
import { User } from '../../users/entities/user.entity'
import { ENV_AWS_S3_BUCKET_URL_KEY } from '../const/env-keys.const'

export enum ImageType {
  POST_IMAGE = 'POST_IMAGE',
  PROFILE_IMAGE = 'PROFILE_IMAGE',
}

@Entity()
export class Image extends BaseEntity {
  @Column({ default: 0 })
  @IsInt()
  @IsOptional()
  order: number

  // User: 사용자 프로필 이미지
  // Post: 게시글 이미지
  @Column({
    type: 'varchar',
    length: 20,
  })
  @IsEnum(ImageType)
  type: ImageType

  // obj: 이미지가 인스턴스화된 객체
  @Column()
  @IsString()
  @Transform(({ value, obj }) => {
    if (obj.type === ImageType.POST_IMAGE) {
      return `${process.env[ENV_AWS_S3_BUCKET_URL_KEY]}/${S3_IMAGES_PATH}/${S3_POST_IMAGE_PATH}/${value}`
    } else if (obj.type === ImageType.PROFILE_IMAGE) {
      return `${process.env[ENV_AWS_S3_BUCKET_URL_KEY]}/${S3_IMAGES_PATH}/${S3_PROFILE_IMAGE_PATH}/${value}`
    } else {
      return value
    }
  })
  path: string

  @ManyToOne(() => Post, (post) => post.images)
  @JoinColumn({ name: 'postId' })
  post?: Post

  @OneToOne(() => User, (user) => user.profileImage)
  user?: User
}
