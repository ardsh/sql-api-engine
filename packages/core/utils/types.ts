export type { FragmentSqlToken as Fragment } from 'slonik'

type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N
export type RemoveAny<T> = IfAny<T, null, T>

export type PromiseOrValue<T> = T | Promise<T>
