import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Expose, Exclude } from 'class-transformer'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  @Expose()
  id: number

  @Column({ length: 50, unique: true })
  @Expose()
  username: string

  @Column({ length: 100 })
  @Expose()
  email: string

  @Column({ length: 100 })
  @Expose()
  nickname: string

  @Column({ length: 255 })
  @Exclude()
  password: string

  @CreateDateColumn()
  @Expose()
  createdAt: Date

  @UpdateDateColumn()
  @Expose()
  updatedAt: Date
}
