import { Column, Entity, ManyToOne } from 'typeorm'
import { BaseEntity } from 'src/common/entities/base.entity'
import { Chat } from 'src/chats/entities/chat.entity'
import { User } from 'src/users/entities/user.entity'

@Entity()
export class Message extends BaseEntity {
  @ManyToOne(() => Chat, (chat) => chat.messages)
  chat: Chat

  @ManyToOne(() => User, (user) => user.messages)
  user: User

  @Column({ type: 'text' })
  content: string
}
