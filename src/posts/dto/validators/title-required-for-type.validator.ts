import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator'
import { PostType } from '../../entities/post.entity'

@ValidatorConstraint({ name: 'titleRequiredForType', async: false })
export class TitleRequiredForTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(title: string, args: ValidationArguments) {
    const object = args.object as any
    const type = object.type

    // 공지사항이나 이벤트인 경우 title이 필수
    if (type === PostType.NOTICE || type === PostType.EVENT) {
      return title !== undefined && title !== null && title.trim().length > 0
    }

    // 사용자 게시글인 경우 title은 선택사항
    return true
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any
    const type = object.type

    if (type === PostType.NOTICE) {
      return '공지사항은 제목이 필수입니다.'
    }
    if (type === PostType.EVENT) {
      return '이벤트는 제목이 필수입니다.'
    }
    return 'title이 유효하지 않습니다.'
  }
}

export function TitleRequiredForType(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: TitleRequiredForTypeConstraint,
    })
  }
}
