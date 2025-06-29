export interface JwtPayload {
  username: string
  sub: number
  iat?: number
  exp?: number
}
