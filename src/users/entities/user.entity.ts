import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Exclude } from 'class-transformer'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 50, unique: true })
  username: string

  @Column({ length: 100 })
  email: string

  @Column({ length: 100 })
  nickname: string

  @Column({ length: 255 })
  @Exclude()
  password: string

  @Column({ default: false })
  isEmailVerified: boolean

  @Column({ length: 6, nullable: true })
  @Exclude()
  emailVerificationCode: string

  @Column({ nullable: true })
  @Exclude()
  emailVerificationExpiresAt: Date

  @CreateDateColumn()
  @Exclude()
  createdAt: Date

  @UpdateDateColumn()
  @Exclude()
  updatedAt: Date
}
