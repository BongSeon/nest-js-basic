import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm'
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator'
import { Exclude, Transform } from 'class-transformer'
import { Post } from '../../posts/entities/post.entity'
import { User } from '../../users/entities/user.entity'
import { getImageUrl } from '../utils/image.util'

export enum ImageType {
  POST_IMAGE = 'POST_IMAGE',
  PROFILE_IMAGE = 'PROFILE_IMAGE',
  COVER_IMAGE = 'COVER_IMAGE',
}

@Entity()
export class Image {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ default: 0 })
  @IsInt()
  @IsOptional()
  @Exclude()
  order: number

  // User: 사용자 프로필 이미지
  // Post: 게시글 이미지
  @Column({
    type: 'varchar',
    length: 20,
  })
  @IsEnum(ImageType)
  @Exclude()
  type: ImageType

  // obj: 이미지가 인스턴스화된 객체
  @Column()
  @IsString()
  @Transform(({ value, obj }) => {
    if (obj.profileUser?.id && obj.type === ImageType.PROFILE_IMAGE) {
      return getImageUrl(value, obj.type, obj.profileUser.id)
    }
    if (obj.coverUser?.id && obj.type === ImageType.COVER_IMAGE) {
      return getImageUrl(value, obj.type, obj.coverUser.id)
    }
    return getImageUrl(value, obj.type)
  })
  path: string

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => Post, (post) => post.images)
  @JoinColumn({ name: 'postId' })
  post?: Post

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  profileUser?: User

  @OneToOne(() => User, (user) => user.cover, { onDelete: 'CASCADE' })
  coverUser?: User
}
