import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm'
import { Exclude, Transform } from 'class-transformer'
import { BaseEntity } from '../../common/entities/base.entity'
import { Image } from '../../common/entities/image.entity'
import { getImageUrl } from '../../common/utils/image.util'
import { ImageType } from '../../common/entities/image.entity'
import { PostReply } from '../../post-replies/entities/post-reply.entity'
import { Chat } from 'src/chats/entities/chat.entity'

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Entity()
export class User extends BaseEntity {
  @Column({ length: 50, unique: true })
  username: string

  @Column({ length: 100 })
  email: string

  @Column({ length: 100 })
  nickname: string

  @Column({ length: 255 })
  @Exclude({
    toPlainOnly: true, // 응답 시 제외
  })
  password: string

  @Column({ default: false })
  isEmailVerified: boolean

  @Column({ length: 6, nullable: true })
  @Exclude()
  emailVerificationCode: string

  @Column({ nullable: true })
  @Exclude()
  emailVerificationExpiresAt: Date

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole

  @OneToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'profileId' })
  @Transform(({ value, obj }) => {
    if (value) {
      return getImageUrl(value.path, ImageType.PROFILE_IMAGE, obj.id)
    }
    return null
  })
  profile?: Image

  @OneToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coverId' })
  @Transform(({ value, obj }) => {
    if (value) {
      return getImageUrl(value.path, ImageType.COVER_IMAGE, obj.id)
    }
    return null
  })
  cover?: Image

  @ManyToMany('Post', 'likedBy')
  likedPosts: any[]

  @OneToMany(() => PostReply, (reply) => reply.user)
  replies: PostReply[]

  @ManyToMany(() => Chat, (chat) => chat.users)
  @JoinTable()
  chats: Chat[]
}
