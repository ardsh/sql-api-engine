import type { QuerySqlToken, FragmentSqlToken, SerializableValue } from 'slonik'
import { makeQueryLoader } from '../engine'

export type Fragment = FragmentSqlToken
export type { QuerySqlToken as Query, SerializableValue }
export type QueryLoader = Pick<
  ReturnType<typeof makeQueryLoader>,
  'getLoadArgs' | 'getSelectableFields' | 'load'
>

type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N
export type RemoveAny<T> = IfAny<T, null, T>

export type PromiseOrValue<T> = T | Promise<T>
