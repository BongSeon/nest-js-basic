import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { IsString, IsNotEmpty } from 'class-validator'
import { Post } from 'src/posts/entities/post.entity'
import { User } from 'src/users/entities/user.entity'
import { BaseEntity } from 'src/common/entities/base.entity'

@Entity('post_reply')
export class PostReply extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column('text')
  @IsString()
  @IsNotEmpty()
  content: string

  @Column()
  userId: number

  @Column()
  postId: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Post, (post) => post.replies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post

  @ManyToOne(() => User, (user) => user.replies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User
}
