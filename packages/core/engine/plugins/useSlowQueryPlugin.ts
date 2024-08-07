import { QuerySqlToken } from 'slonik'
import { LoadParameters } from '../makeQueryLoader'
import type { QueryLoaderPlugin } from './types'

export type SlowQueryNotification = {
  query: QuerySqlToken
  duration: number
  result: any
  args: LoadParameters<any, any, any, any, string, boolean>
}

const defaultLogSlowQuery = (options: SlowQueryNotification) => {
  console.log(`Slow query: ${options.query.sql} (${options.duration}ms)`)
}

export const useSlowQueryPlugin = ({
  slowQueryThreshold = 1000,
  callback = defaultLogSlowQuery
} = {}): QueryLoaderPlugin => {
  const onLoad: QueryLoaderPlugin['onLoad'] &
    QueryLoaderPlugin['onLoadPagination'] = loadOptions => {
    const start = Date.now()
    return {
      onLoadDone(options: any) {
        const duration = Date.now() - start
        if (duration >= slowQueryThreshold) {
          callback({
            query: loadOptions.query,
            duration,
            result: options.result,
            args: loadOptions.args
          })
        }
      }
    }
  }
  return {
    onLoad,
    onLoadPagination: onLoad
  }
}
