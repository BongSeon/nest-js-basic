import { FindManyOptions } from 'typeorm'
import { User } from '../entities/user.entity'

export const DEFAULT_USER_FIND_OPTIONS: FindManyOptions<User> = {
  relations: ['profile', 'cover'],
}
