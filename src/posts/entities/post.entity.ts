import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Expose, Exclude } from 'class-transformer'
import { User } from '../../users/entities/user.entity'
import { BaseEntity } from '../../common/entities/base.entity'

@Entity()
export class Post extends BaseEntity {
  @Column({ length: 100 })
  @Expose()
  title: string

  @Column({ type: 'text' })
  @Expose()
  content: string

  @Column({ length: 500, nullable: true })
  @Expose()
  imageUrl: string

  @Column()
  @Exclude()
  userId: number

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  @Expose()
  user: User
}
