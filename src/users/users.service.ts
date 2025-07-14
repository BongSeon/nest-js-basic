import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { UserPayload } from './types/user-payload.interface'
import { MeDto } from './dto/me.dto'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
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
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10)

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    })
    return await this.usersRepository.save(user)
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find()
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return user
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id)

    // 비밀번호가 제공된 경우 해싱
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10)
    }

    Object.assign(user, updateUserDto)
    return await this.usersRepository.save(user)
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id)
    await this.usersRepository.remove(user)
  }

  /**
   * 현재 인증된 사용자의 정보를 조회합니다.
   * @param userPayload JWT 토큰에서 추출된 사용자 정보
   * @returns 사용자 정보 (createdAt, updatedAt 포함)
   */
  async getMe(userPayload: UserPayload): Promise<MeDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userPayload.id },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // MeDto 형태로 변환하여 createdAt, updatedAt 포함
    const meDto = new MeDto()
    meDto.id = user.id
    meDto.username = user.username
    meDto.email = user.email
    meDto.nickname = user.nickname
    meDto.isEmailVerified = user.isEmailVerified
    meDto.createdAt = user.createdAt
    meDto.updatedAt = user.updatedAt

    return meDto
  }
}
