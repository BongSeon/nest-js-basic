import { Column, Entity, ManyToMany, ManyToOne, OneToMany } from 'typeorm'
import { BaseEntity } from 'src/common/entities/base.entity'
import { User } from 'src/users/entities/user.entity'
import { Message } from '../messages/entities/message.entity'

export enum ChatType {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

@Entity()
export class Chat extends BaseEntity {
  // 채팅방 제목
  @Column({ length: 100 })
  title: string

  // 채팅방에 참여한 유저들
  @ManyToMany(() => User, (user) => user.chats)
  users: User[]

  // 채팅방에 참여한 유저들이 주고받은 메시지들
  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[]

  // 채팅방 개설자
  @ManyToOne(() => User, (user) => user.chats)
  owner: User

  @Column({
    type: 'enum',
    enum: ChatType,
    default: ChatType.PRIVATE,
  })
  type: ChatType
}
