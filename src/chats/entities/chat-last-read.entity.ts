import { Entity, ManyToOne, Column, Unique, Index } from 'typeorm'
import { BaseEntity } from 'src/common/entities/base.entity'
import { Chat } from './chat.entity'
import { User } from 'src/users/entities/user.entity'

@Entity()
@Unique('UQ_chat_last_read_chat_user', ['chat', 'user'])
export class ChatLastRead extends BaseEntity {
  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @Index('IDX_chat_last_read_chat')
  chat: Chat

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Index('IDX_chat_last_read_user')
  user: User

  @Column({ type: 'datetime', nullable: true })
  lastReadAt: Date | null
}
