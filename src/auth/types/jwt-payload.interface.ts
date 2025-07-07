export interface JwtPayload {
  username: string
  sub: number
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}
