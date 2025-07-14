import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User } from '../users/entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
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
   * 1단계 회원가입: 사용자 정보를 받아서 임시 사용자를 생성하고 인증 코드를 생성
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

    // 6자리 랜덤 인증 코드 생성
    const verificationCode = this.generateVerificationCode()

    // 인증 코드 만료 시간 설정 (10분 후)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // 사용자 생성 (이메일 미인증 상태)
    const user = this.usersRepository.create({
      ...registerDto,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpiresAt: expiresAt,
    })

    const savedUser = await this.usersRepository.save(user)

    // 테스트용으로 인증 코드를 반환 (실제로는 이메일로 발송)
    return {
      message: '회원가입 1단계가 완료되었습니다. 이메일 인증을 진행해주세요.',
      email: savedUser.email,
      verificationCode: verificationCode, // 테스트용 - 실제 배포시 제거
      expiresAt: expiresAt,
    }
  }

  /**
   * 2단계 회원가입: 이메일 인증 코드 확인
   */
  async registerStep2(verifyEmailDto: VerifyEmailDto) {
    const { email, verificationCode } = verifyEmailDto

    // 사용자 찾기
    const user = await this.usersRepository.findOne({
      where: { email },
    })

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.')
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('이미 인증된 이메일입니다.')
    }

    // 인증 코드 확인
    if (user.emailVerificationCode !== verificationCode) {
      throw new BadRequestException('인증 코드가 일치하지 않습니다.')
    }

    // 인증 코드 만료 확인
    if (new Date() > user.emailVerificationExpiresAt) {
      throw new BadRequestException('인증 코드가 만료되었습니다.')
    }

    // 이메일 인증 완료 처리
    user.isEmailVerified = true
    user.emailVerificationCode = null
    user.emailVerificationExpiresAt = null

    await this.usersRepository.save(user)

    // 로그인 처리 (토큰 발급)
    return this.loginUser(user)
  }

  /**
   * 6자리 랜덤 인증 코드 생성
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * 인증 코드 재발송
   */
  async resendVerificationCode(email?: string) {
    if (!email) {
      throw new BadRequestException('이메일을 입력해주세요.')
    }

    const user = await this.usersRepository.findOne({
      where: { email },
    })

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.')
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('이미 인증된 이메일입니다.')
    }

    // 새로운 인증 코드 생성
    const verificationCode = this.generateVerificationCode()

    // 인증 코드 만료 시간 설정 (10분 후)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // 인증 코드 업데이트
    user.emailVerificationCode = verificationCode
    user.emailVerificationExpiresAt = expiresAt

    await this.usersRepository.save(user)

    // 테스트용으로 인증 코드를 반환 (실제로는 이메일로 발송)
    return {
      message: '인증 코드가 재발송되었습니다.',
      email: user.email,
      verificationCode: verificationCode, // 테스트용 - 실제 배포시 제거
      expiresAt: expiresAt,
    }
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
      user,
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

    const expiresIn = type === 'access' ? '10m' : '1h'

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
        secret: process.env.JWT_SECRET || 'jwt-secret',
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
   *  - RefreshTokenGuard를 통해 이미 검증된 사용자 정보를 받아 새로운 access 토큰을 발급
   */
  async refreshToken(userId: number) {
    // DB에서 사용자 확인
    const user = await this.usersRepository.findOne({
      where: { id: userId },
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
    try {
      const secret = process.env.JWT_SECRET || 'jwt-secret'
      return this.jwtService.verifyAsync(token, { secret })
    } catch (error) {
      throw new UnauthorizedException(
        '토큰이 만료되었거나 유효하지 않습니다.' + error.message
      )
    }
  }
}
