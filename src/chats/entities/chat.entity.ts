import { BaseEntity } from 'src/common/entities/base.entity'
import { User } from 'src/users/entities/user.entity'
import { Entity, ManyToMany } from 'typeorm'

@Entity()
export class Chat extends BaseEntity {
  @ManyToMany(() => User, (user) => user.chats)
  users: User[]
}
