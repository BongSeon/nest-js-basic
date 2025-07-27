import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm'
import { Exclude } from 'class-transformer'
import { User } from '../../users/entities/user.entity'
import { BaseEntity } from '../../common/entities/base.entity'
import { Image } from '../../common/entities/image.entity'

export enum PostType {
  USER = 'user',
  NOTICE = 'notice',
  EVENT = 'event',
}

@Entity()
export class Post extends BaseEntity {
  @Column({ length: 100, nullable: true })
  title?: string

  @Column({ type: 'text' })
  content: string

  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.USER,
  })
  type: PostType

  @Column()
  @Exclude()
  userId: number

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User

  @OneToMany(() => Image, (image) => image.post)
  images: Image[]

  @Column({ default: 0 })
  likeCount: number

  @ManyToMany(() => User, (user) => user.likedPosts)
  @JoinTable({
    name: 'post_like',
    joinColumn: { name: 'postId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  likedBy: User[]
}
