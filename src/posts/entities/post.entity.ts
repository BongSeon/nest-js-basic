import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Expose } from 'class-transformer'

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

  @CreateDateColumn()
  @Expose()
  createdAt: Date

  @UpdateDateColumn()
  @Expose()
  updatedAt: Date
}
