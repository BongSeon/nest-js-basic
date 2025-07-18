import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { ConfigService } from '@nestjs/config'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { ENV_HASH_ROUNDS_KEY } from '../common/const/env-keys.const'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 중복 사용자 확인
    const existingUser = await this.usersRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    })

    if (existingUser) {
      throw new ConflictException('Username or email already exists')
    }

    // 비밀번호 해싱
    let hashedPassword: string

    try {
      const hashRounds = Number(
        this.configService.get<string>(ENV_HASH_ROUNDS_KEY, '10')
      )
      const salt = await bcrypt.genSalt(hashRounds)
      hashedPassword = await bcrypt.hash(createUserDto.password, salt)
    } catch (error) {
      console.error('Password hashing error:', error)
      throw new Error('비밀번호 해싱 중 오류가 발생했습니다.')
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    })
    return await this.usersRepository.save(user)
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find({
      relations: ['profile'],
    })
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile'],
    })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return user
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id)

    // 비밀번호가 제공된 경우 해싱
    if (updateUserDto.password) {
      try {
        const hashRounds = Number(
          this.configService.get<string>(ENV_HASH_ROUNDS_KEY, '10')
        )
        const salt = await bcrypt.genSalt(hashRounds)
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt)
      } catch (error) {
        console.error('Password hashing error:', error)
        throw new Error('비밀번호 해싱 중 오류가 발생했습니다.')
      }
    }

    Object.assign(user, updateUserDto)
    return await this.usersRepository.save(user)
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id)
    await this.usersRepository.remove(user)
  }
}
