import { ImageType } from '../entities/image.entity'
import {
  S3_POST_IMAGE_PATH,
  S3_PROFILE_IMAGE_PATH,
  S3_IMAGES_PATH,
} from '../const/path.const'
import { ENV_AWS_S3_BUCKET_URL_KEY } from '../const/env-keys.const'

export function getImageUrl(path: string, type: ImageType): string {
  if (type === ImageType.POST_IMAGE) {
    return `${process.env[ENV_AWS_S3_BUCKET_URL_KEY]}/${S3_IMAGES_PATH}/${S3_POST_IMAGE_PATH}/${path}`
  } else if (type === ImageType.PROFILE_IMAGE) {
    return `${process.env[ENV_AWS_S3_BUCKET_URL_KEY]}/${S3_IMAGES_PATH}/${S3_PROFILE_IMAGE_PATH}/${path}`
  } else {
    return path
  }
}
