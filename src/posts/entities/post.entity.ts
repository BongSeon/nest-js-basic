import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Expose, Exclude } from 'class-transformer'
import { User } from '../../users/entities/user.entity'

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  @Expose()
  id: number

  @Column({ length: 100 })
  @Expose()
  title: string

  @Column({ type: 'text' })
  @Expose()
  content: string

  @Column()
  @Exclude()
  userId: number

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  @Expose()
  user: User

  @CreateDateColumn()
  @Expose()
  createdAt: Date

  @UpdateDateColumn()
  @Expose()
  updatedAt: Date
}
