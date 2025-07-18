import { ImageType } from '../entities/image.entity'
import {
  S3_POST_IMAGE_PATH,
  S3_PROFILE_IMAGE_PATH,
  S3_IMAGES_PATH,
} from '../const/path.const'
import { ENV_AWS_S3_BUCKET_URL_KEY } from '../const/env-keys.const'

export function getImageUrl(
  path: string,
  type: ImageType,
  userId?: number
): string {
  if (type === ImageType.POST_IMAGE) {
    return `${process.env[ENV_AWS_S3_BUCKET_URL_KEY]}/${S3_IMAGES_PATH}/${S3_POST_IMAGE_PATH}/${path}`
  } else if (type === ImageType.PROFILE_IMAGE && userId) {
    return `${process.env[ENV_AWS_S3_BUCKET_URL_KEY]}/${S3_IMAGES_PATH}/${S3_PROFILE_IMAGE_PATH}/${getUserGroup(userId)}/${userId}/${path}`
  } else {
    return path
  }
}

// userId로 그룹 폴더명을 반환
// ex. 1 -> 0~100, 114 -> 100~200, ..
export function getUserGroup(userId: number): string {
  return `${Math.floor(userId / 100) * 100}~${Math.floor(userId / 100) * 100 + 100}`
}
