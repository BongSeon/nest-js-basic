import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common'
import { catchError, Observable, tap } from 'rxjs'
import { DataSource } from 'typeorm'

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()

    const qr = this.dataSource.createQueryRunner()

    // 트랜잭션과 관련된 모든 쿼리를 담당할 쿼리 러너를 생성한다.
    await qr.connect()

    // 트랜잭션 시작
    await qr.startTransaction()

    req.queryRunner = qr

    return next.handle().pipe(
      catchError(async (err) => {
        await qr.rollbackTransaction()
        await qr.release()

        throw new InternalServerErrorException(err.message)
      }),
      tap(async () => {
        await qr.commitTransaction()
        await qr.release()
      })
    )
  }
}
