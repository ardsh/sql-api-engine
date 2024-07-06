export * from './buildView'
import { makeQueryLoader } from './makeQueryLoader'

export {
  type InferArgs,
  type InferPayload,
  makeQueryLoader
} from './makeQueryLoader'

type ReturnFirstArgument<T> = T extends (...args: readonly [infer A]) => any
  ? <G extends A = A>(...args: readonly [G]) => G
  : T

export type LoaderOptions = Parameters<typeof makeQueryLoader>[0]
export const createOptions: ReturnFirstArgument<
  typeof makeQueryLoader
> = options => {
  return options
}

export type { QueryLoaderPlugin as Plugin } from './plugins/types'

export { sqlWith } from './sqlWith'
export { makeCountLoader } from './makeCountLoader'
