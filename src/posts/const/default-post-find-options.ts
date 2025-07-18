import { FindManyOptions } from 'typeorm'
import { Post } from '../entities/post.entity'

export const DEFAULT_POST_FIND_OPTIONS: FindManyOptions<Post> = {
  relations: ['user', 'user.profile', 'images'],
  order: {
    createdAt: 'DESC',
  },
}
