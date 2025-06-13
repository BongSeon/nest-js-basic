import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User } from '../users/entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  /**
   * 1. registerWithEmail
   *    - email, username, nickname, password를 받아서 새로운 사용자를 생성한다.
   *    - 생성이 완료되면 accessToken과 refreshToken을 반환한다.
   *      회원가입 후 다시 로그인할 필요 없도록 (쓸데없는 과정을 줄이기 위해)
   */
  async registerWithEmail(registerDto: RegisterDto) {
    // 중복 사용자 확인
    const existingUser = await this.usersRepository.findOne({
      where: [{ username: registerDto.username }, { email: registerDto.email }],
    })

    if (existingUser) {
      throw new ConflictException('Username or email already exists')
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(registerDto.password, 10)

    // 사용자 생성
    const user = this.usersRepository.create({
      ...registerDto,
      password: hashedPassword,
    })

    const savedUser = await this.usersRepository.save(user)

    // 토큰 생성 및 반환
    return this.loginUser(savedUser)
  }

  /**
   * 2. loginWithUsername
   *   - username, password를 받아서 사용자 검증을 한다.
   *   - 검증이 완료되면 accessToken과 refreshToken을 반환한다.
   */
  async loginWithUsername(loginDto: LoginDto) {
    const user = await this.authenticateWithUsernameAndPassword(
      loginDto.username,
      loginDto.password
    )

    return this.loginUser(user)
  }

  /**
   * 3. loginUser
   *  - 1, 2번 과정에서 필요한 AccessToken과 RefreshToken을 반환한다.
   */
  async loginUser(user: User) {
    const payload = { username: user.username, sub: user.id }

    return {
      accessToken: this.signToken(payload, 'access'),
      refreshToken: this.signToken(payload, 'refresh'),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
      },
    }
  }

  /**
   * 4. signToken
   *  - 3번 과정에서 필요한 AccessToken과 RefreshToken을 sign하는 로직
   */
  signToken(payload: any, type: 'access' | 'refresh') {
    const secret =
      type === 'access'
        ? process.env.JWT_ACCESS_SECRET || 'access-secret'
        : process.env.JWT_REFRESH_SECRET || 'refresh-secret'

    const expiresIn = type === 'access' ? '15m' : '7d'

    return this.jwtService.sign(payload, {
      secret,
      expiresIn,
    })
  }

  /**
   * 5. authenticateWithUsernameAndPassword
   *  - 2번 과정에서 필요한 기본적인 사용자 검증 로직
   *    1) 사용자가 존재하는지 확인 (username)
   *    2) 사용자의 비밀번호가 일치하는지 확인
   *    3) 이상이 없다면 사용자 정보를 반환
   */
  async authenticateWithUsernameAndPassword(
    username: string,
    password: string
  ): Promise<User> {
    // 1) 사용자가 존재하는지 확인 (username)
    const user = await this.usersRepository.findOne({ where: { username } })
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // 2) 사용자의 비밀번호가 일치하는지 확인
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // 3) 이상이 없다면 사용자 정보를 반환
    return user
  }
}
