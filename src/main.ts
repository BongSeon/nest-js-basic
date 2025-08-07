import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { json, urlencoded } from 'express'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
// import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 파일 업로드를 위한 body parser 설정
  app.use(json({ limit: '10mb' }))
  app.use(urlencoded({ extended: true, limit: '10mb' }))

  // CORS 설정
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  // 전역 Exception Filter 등록
  // app.useGlobalFilters(new HttpExceptionFilter())

  // 전역 인터셉터 등록
  app.useGlobalInterceptors(new ResponseInterceptor())

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // 요청 데이터를 DTO 클래스의 인스턴스로 변환
      transformOptions: {
        enableImplicitConversion: true, // 요청 데이터를 DTO 클래스의 인스턴스로 변환
      },
      whitelist: true, // DTO에 정의되지 않은 속성은 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 요청 자체를 막음
    })
  )
  await app.listen(3000)
}
bootstrap()
