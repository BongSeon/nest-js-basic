import { Module } from '@nestjs/common'
import { S3UploadService } from './services/s3-upload.service'
import { UploadController } from './controllers/upload.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [S3UploadService],
  exports: [S3UploadService],
})
export class CommonModule {}
