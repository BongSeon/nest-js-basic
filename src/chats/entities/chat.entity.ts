import { Entity, ManyToMany, OneToMany } from 'typeorm'
import { BaseEntity } from 'src/common/entities/base.entity'
import { User } from 'src/users/entities/user.entity'
import { Message } from '../messages/entities/message.entity'

@Entity()
export class Chat extends BaseEntity {
  @ManyToMany(() => User, (user) => user.chats)
  users: User[]

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[]
}
