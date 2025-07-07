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
import { TokenBlacklistService } from './services/token-blacklist.service'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService
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
    return {
      accessToken: this.signToken(user, 'access'),
      refreshToken: this.signToken(user, 'refresh'),
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
  signToken(user: Pick<User, 'username' | 'id'>, type: 'access' | 'refresh') {
    const payload = {
      username: user.username,
      sub: user.id,
      type: type,
    }

    const secret = process.env.JWT_SECRET || 'jwt-secret'

    const expiresIn = type === 'access' ? '3m' : '7d'

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

  /**
   * 6. getUserFromToken
   *  - JWT 토큰으로부터 사용자 정보를 추출하고 DB에서 해당 사용자를 찾아 반환
   */
  async getUserFromToken(token: string): Promise<User> {
    try {
      // 토큰 검증
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'access-secret',
      })

      // DB에서 사용자 찾기
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      })

      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      return user
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }

  /**
   * 7. logout
   *  - 현재 토큰을 블랙리스트에 추가하여 무효화
   */
  async logout(token: string): Promise<{ message: string }> {
    // 토큰을 블랙리스트에 추가
    this.tokenBlacklistService.addToBlacklist(token)

    return {
      message: 'Successfully logged out',
    }
  }

  /**
   * 8. refreshToken
   *  - 리프레시 토큰을 검증하고 새로운 access 토큰을 발급
   */
  async refreshToken(refreshToken: string) {
    try {
      // 리프레시 토큰 검증
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET || 'jwt-secret',
      })

      // 블랙리스트 확인
      if (this.tokenBlacklistService.isBlacklisted(refreshToken)) {
        throw new UnauthorizedException('Refresh token has been revoked')
      }

      // DB에서 사용자 확인
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      })

      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      // 새로운 access 토큰 발급
      const newAccessToken = this.signToken(user, 'access')

      return {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
        },
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token has expired')
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid refresh token format')
      } else {
        throw new UnauthorizedException('Invalid refresh token')
      }
    }
  }

  /**
   * 9. extractTokenFromHeader
   *  - 헤더에서 토큰을 추출하는 로직
   */
  extractTokenFromHeader(
    request: Request,
    tokenType: 'Bearer' | 'Basic'
  ): string | undefined {
    const rawToken = request.headers['authorization']

    if (!rawToken) {
      throw new UnauthorizedException('Token not found in Authorization header')
    }

    if (rawToken.startsWith(tokenType + ' ')) {
      return rawToken.substring(tokenType.length + 1)
    }

    throw new UnauthorizedException('Invalid token format')
  }

  /**
   * 10. decodeBasicToken
   *  - Basic 토큰을 디코딩하는 로직
   */
  decodeBasicToken(token: string) {
    const credentials = Buffer.from(token, 'base64').toString('utf-8')
    const [username, password] = credentials.split(':')

    return { username, password }
  }

  /**
   * 11. verifyToken
   *  - 토큰을 검증하는 로직
   */
  verifyToken(token: string) {
    const secret = process.env.JWT_SECRET || 'jwt-secret'

    return this.jwtService.verifyAsync(token, { secret })
  }
}
