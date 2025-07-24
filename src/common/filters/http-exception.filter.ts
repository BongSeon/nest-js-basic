import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status: number
    let message: string

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse['message']
      ) {
        // Validation 에러 등에서 message가 배열로 올 수 있음
        const msg = exceptionResponse['message']
        message = Array.isArray(msg) ? msg.join(', ') : msg
      } else {
        message = exception.message || '알 수 없는 오류가 발생했습니다.'
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR
      message = '서버 내부 오류가 발생했습니다.'
      // 개발 환경에서는 실제 에러 메시지를 로그로 출력
      console.error('Unhandled exception:', exception)
    }

    response.status(status).json({
      ok: false,
      status,
      message,
    })
  }
}
