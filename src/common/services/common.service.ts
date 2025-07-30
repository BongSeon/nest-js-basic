import { BadRequestException, Injectable } from '@nestjs/common'
import {
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  Repository,
} from 'typeorm'
import { BasePaginateDto } from '../dto/base-pagination.dto'
import { FILTER_MAP } from '../const/filter-map.const'
import { BaseEntity } from '../entities/base.entity'
import { HOST, PROTOCOL } from '../const/env-keys.const'

@Injectable()
export class CommonService {
  paginate<T extends BaseEntity>(
    dto: BasePaginateDto,
    repository: Repository<T>,
    overrideFindOptions?: FindManyOptions<T>,
    path?: string
  ) {
    if (dto.page) {
      return this.pagePaginate(dto, repository, overrideFindOptions)
    } else {
      return this.cursorPaginate(dto, repository, overrideFindOptions, path)
    }
  }

  private async pagePaginate<T extends BaseEntity>(
    dto: BasePaginateDto,
    repository: Repository<T>,
    overrideFindOptions?: FindManyOptions<T>
  ) {
    const findOptions = this.composeFindOptions<T>(dto)

    const [results, count] = await repository.findAndCount({
      ...findOptions,
      ...overrideFindOptions,
    })

    return {
      items: results,
      total: count,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(count / dto.limit),
    }
  }

  private async cursorPaginate<T extends BaseEntity>(
    dto: BasePaginateDto,
    repository: Repository<T>,
    overrideFindOptions?: FindManyOptions<T>,
    path?: string
  ) {
    const findOptions = this.composeFindOptions<T>(dto)

    const results = await repository.find({
      ...findOptions,
      ...overrideFindOptions,
    })

    // 해당되는 항목이 0개 이상이면 마지막 항목 아니면 null 반환
    const lastItem =
      results.length > 0 && results.length === dto.limit
        ? results[results.length - 1]
        : null

    const nextUrl = lastItem && new URL(`${PROTOCOL}://${HOST}/${path}`)

    if (nextUrl) {
      /**
       *
       */
      for (const key of Object.keys(dto)) {
        if (dto[key]) {
          if (
            key !== 'where__id__greater_than' &&
            key !== 'where__id__less_than'
          ) {
            nextUrl.searchParams.append(key, dto[key])
          }
        }
      }

      let key = null

      if (dto.order__createdAt === 'ASC') {
        key = 'where__id__greater_than'
      } else {
        key = 'where__id__less_than'
      }

      nextUrl.searchParams.append(key, lastItem.id.toString())
    }

    return {
      items: results,
      cursor: {
        after: lastItem?.id ?? null,
      },
      nextUrl: nextUrl?.toString() ?? null,
    }
  }

  private composeFindOptions<T extends BaseEntity>(
    dto: BasePaginateDto
  ): FindManyOptions<T> {
    /**
     * where,
     * order,
     * take,
     * skip -> page 기반일 때 만
     *
     * 1) where로 시작한다면 필터 로직을 적용한다.
     * 2) order로 시작한다면 정렬 로직을 적용한다.
     * 3) 필터 로직을 적용한다면 '__'기준으로 split 했을 때 3개의 값으로 나뉘는지
     *    2개의 값으로 나뉘는지 확인한다.
     *    3-1) 3개의 값으로 나뉘는 경우 첫번째 값은 키워드, 두번째 값은 키값, 세번째 값은 유틸리티
     *         FILTER_MAP에서 해당되는 operator(함수)를 찾아서 적용한다.
     *         ex) where__id__greater_than
     *             ['where', 'id', 'greater_than'] -> id > 10
     *    3-2) 2개의 값으로 나뉘는 경우 첫번째 값은 키워드, 두번째 값은 키값
     *         ex) where__id
     *         ex) ['where', 'id'] -> id = 10
     * 4) 정렬 로직의 경우 3-2)와 같음.
     */

    let where: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {}
    let order: FindOptionsOrder<T> = {}

    for (const [key, value] of Object.entries(dto)) {
      // key -> where__id__greater_than
      // value -> 10
      if (key.startsWith('where__')) {
        where = { ...where, ...this.parseWhereFilter(key, value) }
      } else if (key.startsWith('order__')) {
        order = { ...order, ...this.parseWhereFilter(key, value) }
      }
    }

    // where_or__username__i_like 형식의 필터를 처리
    const whereOptions = { ...where }

    for (const [key, value] of Object.entries(dto)) {
      if (key.startsWith('or_where__')) {
        const parsedFilter = this.parseWhereFilter(
          key.replace('or_', ''),
          value
        ) as FindOptionsWhere<T>
        if (!Array.isArray(where)) {
          where = [{ ...whereOptions, ...parsedFilter }]
        } else {
          where.push({ ...whereOptions, ...parsedFilter })
        }
      }
    }

    return {
      where,
      order,
      take: dto.limit,
      skip: dto.page ? (dto.page - 1) * dto.limit : undefined,
    }
  }

  private parseWhereFilter<T extends BaseEntity>(
    key: string,
    value: any
  ): FindOptionsWhere<T> | FindOptionsOrder<T> {
    const options: FindOptionsWhere<T> = {}

    const split = key.split('__')

    if (split.length !== 2 && split.length !== 3) {
      throw new BadRequestException(
        `where 필터는 __기준으로 2개 또는 3개의 값으로 나뉘어야 합니다. 문제되는 키 값: ${key}`
      )
    }

    if (split.length === 2) {
      // ['where', 'id']
      const field = split[1]

      // { id: 10 }
      options[field] = value
    } else if (split.length === 3) {
      /**
       * 길이가 3일 경우는 Typeorm 유틸리티 적용이 필요한 경우다.
       *
       * where__id__greater_than의 경우
       * where는 버리고 두번째 값은 키값, 세번째 값은 유틸리티 함수다.
       */
      // ['where', 'id', 'greater_than']
      const field = split[1] // id
      const operator = split[2] // greater_than

      // where__id__between = 3,4
      // split의 특징 대상 문자가 존재하지 않으면 길이가 무조건 1이다.
      // const values = value.toString().split(',')
      // if(operator==='between'){
      //   options[field] = FILTER_MAP[operator](values[0], values[1])
      // } else {
      //   options[field] = FILTER_MAP[operator](value)
      // }

      if (operator === 'i_like') {
        options[field] = FILTER_MAP[operator](`%${value}%`)
      } else {
        // { id: MoreThan(10) }
        options[field] = FILTER_MAP[operator](value)
      }
    }

    return options
  }
}
