import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common'

export const QueryRunner = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest()

    if (!req.queryRunner) {
      throw new InternalServerErrorException(
        'QueryRunner Decorator는 TransactionInterceptor와 함께 사용되어야 합니다.'
      )
    }

    return req.queryRunner
  }
)
