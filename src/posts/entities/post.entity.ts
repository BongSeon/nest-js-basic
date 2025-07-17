import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { Exclude } from 'class-transformer'
import { User } from '../../users/entities/user.entity'
import { BaseEntity } from '../../common/entities/base.entity'
import { Image } from '../../common/entities/image.entity'

@Entity()
export class Post extends BaseEntity {
  @Column({ length: 100 })
  title: string

  @Column({ type: 'text' })
  content: string

  @Column()
  @Exclude()
  userId: number

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User

  @OneToMany(() => Image, (image) => image.post)
  images: Image[]
}
