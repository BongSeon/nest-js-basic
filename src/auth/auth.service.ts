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
import { ConfigService } from '@nestjs/config'
import { User } from '../users/entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { UpdateProfileImageDto } from './dto/update-profile-image.dto'
import { TokenBlacklistService } from './services/token-blacklist.service'
import { MeDto } from '../users/dto/me.dto'
import { Image, ImageType } from '../common/entities/image.entity'
import { S3UploadService } from '../common/services/s3-upload.service'
import { getImageUrl } from '../common/utils/image.util'
import {
  ENV_JWT_SECRET_KEY,
  ENV_HASH_ROUNDS_KEY,
} from 'src/common/const/env-keys.const'
import { DEFAULT_USER_FIND_OPTIONS } from 'src/users/const/default-user-find-options'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Image)
    private imageRepository: Repository<Image>,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
    private configService: ConfigService,
    private s3UploadService: S3UploadService
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
    let hashedPassword: string

    try {
      const hashRounds = Number(
        this.configService.get<string>(ENV_HASH_ROUNDS_KEY, '10')
      )
      const salt = await bcrypt.genSalt(hashRounds)
      hashedPassword = await bcrypt.hash(registerDto.password, salt)
    } catch (error) {
      console.error('Password hashing error:', error)
      throw new Error('비밀번호 해싱 중 오류가 발생했습니다.')
    }

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
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        profile: user.profile
          ? getImageUrl(user.profile.path, ImageType.PROFILE_IMAGE, user.id)
          : undefined,
        cover: user.cover
          ? getImageUrl(user.cover.path, ImageType.COVER_IMAGE, user.id)
          : undefined,
      },
    }
  }

  /**
   * 4. signToken
   *  - 3번 과정에서 필요한 AccessToken과 RefreshToken을 sign하는 로직
   */
  signToken(
    user: Pick<User, 'username' | 'id' | 'role'>,
    type: 'access' | 'refresh'
  ) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      type: type,
    }

    const secret = this.configService.get<string>(ENV_JWT_SECRET_KEY)

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
    const user = await this.usersRepository.findOne({
      where: { username },
      ...DEFAULT_USER_FIND_OPTIONS,
    })
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
        secret: this.configService.get<string>(ENV_JWT_SECRET_KEY),
      })

      // DB에서 사용자 찾기
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
        ...DEFAULT_USER_FIND_OPTIONS,
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
      ...DEFAULT_USER_FIND_OPTIONS,
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
        profile: user.profile,
        cover: user.cover,
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
      const secret = this.configService.get<string>(ENV_JWT_SECRET_KEY)
      return this.jwtService.verifyAsync(token, { secret })
    } catch (error) {
      throw new UnauthorizedException(
        '토큰이 만료되었거나 유효하지 않습니다.' + error.message
      )
    }
  }

  /**
   * 현재 인증된 사용자의 정보를 조회합니다.
   * @param userPayload JWT 토큰에서 추출된 사용자 정보
   * @returns 사용자 정보 (createdAt, updatedAt 포함)
   */
  async getMe(query?: { id?: number; username?: string }): Promise<MeDto> {
    let user: User
    if (query.id) {
      user = await this.usersRepository.findOne({
        where: { id: query.id as number },
        ...DEFAULT_USER_FIND_OPTIONS,
      })
    } else if (query.username) {
      user = await this.usersRepository.findOne({
        where: { username: query.username },
        ...DEFAULT_USER_FIND_OPTIONS,
      })
    }

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // MeDto 형태로 변환하여 createdAt, updatedAt 포함
    const meDto = new MeDto()
    meDto.id = user.id
    meDto.username = user.username
    meDto.email = user.email
    meDto.nickname = user.nickname
    meDto.isEmailVerified = user.isEmailVerified
    meDto.role = user.role
    meDto.createdAt = user.createdAt
    meDto.profile = user.profile
      ? getImageUrl(user.profile.path, ImageType.PROFILE_IMAGE, user.id)
      : undefined
    meDto.cover = user.cover
      ? getImageUrl(user.cover.path, ImageType.COVER_IMAGE, user.id)
      : undefined

    return meDto
  }

  /**
   * 프로필 이미지 업데이트
   * @param userId 사용자 ID
   * @param updateProfileImageDto 프로필 이미지 업데이트 DTO
   * @returns 업데이트된 사용자 정보
   */
  async updateProfileImage(
    userId: number,
    updateProfileImageDto: UpdateProfileImageDto
  ): Promise<{ message: string }> {
    // 사용자 조회
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    })

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.')
    }

    if (updateProfileImageDto.type === ImageType.PROFILE_IMAGE) {
      // 기존 프로필 이미지가 있다면 삭제
      if (user.profile) {
        await this.s3UploadService.deleteProfileImage(userId, user.profile.path)
        await this.imageRepository.remove(user.profile)
      }
    } else if (updateProfileImageDto.type === ImageType.COVER_IMAGE) {
      // 기존 커버 이미지가 있다면 삭제
      if (user.cover) {
        await this.s3UploadService.deleteProfileImage(userId, user.cover.path)
        await this.imageRepository.remove(user.cover)
      }
    }

    // temp 폴더의 이미지를 profile 폴더로 이동 (사용자별 폴더 구조)
    await this.s3UploadService.moveImageFromTempToProfile(
      updateProfileImageDto.image,
      userId
    )

    // 새로운 이미지 엔터티 생성
    const newProfileImage = this.imageRepository.create({
      path: updateProfileImageDto.image, // 파일명만 저장
      type: updateProfileImageDto.type,
      user: user,
    })

    const savedImage = await this.imageRepository.save(newProfileImage)

    // 사용자의 프로필 이미지 업데이트
    if (updateProfileImageDto.type === ImageType.PROFILE_IMAGE) {
      user.profile = savedImage
    } else if (updateProfileImageDto.type === ImageType.COVER_IMAGE) {
      user.cover = savedImage
    }
    await this.usersRepository.save(user)

    return {
      message: '프로필 이미지가 업데이트되었습니다.',
    }
  }
}
