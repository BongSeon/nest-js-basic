import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp()
    const response = ctx.getResponse()

    return next.handle().pipe(
      map((data) => {
        if (data.data && data.message) {
          return {
            ok: true,
            status: response.statusCode,
            data: data.data,
            message: data.message,
          }
        } else {
          return {
            ok: true,
            status: response.statusCode,
            data,
            message: '요청이 성공적으로 처리되었습니다.',
          }
        }
      })
    )
  }
}
