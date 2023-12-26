import {
  SerializableValue,
  QuerySqlToken,
  IdentifierSqlToken,
  FragmentSqlToken,
  CommonQueryMethods,
  sql
} from 'slonik'
import { parseSqlQueryValues } from '../shared'

export const getColumnIdentifiers = <T>(tableAlias: string) => {
  return new Proxy(
    {
      names: [tableAlias],
      type: 'SLONIK_TOKEN_IDENTIFIER'
    } as any,
    {
      get: (_target, property: string) => {
        if (property === '*')
          return sql.fragment`${sql.identifier([tableAlias])}.*`
        if (!property) return sql.identifier([tableAlias])
        if (property === 'type') return 'SLONIK_TOKEN_IDENTIFIER'
        if (property === 'names') return [tableAlias]
        return sql.identifier([tableAlias, property])
      }
    }
  ) as Record<keyof T | '*', IdentifierSqlToken>
}

function getSqlWithArrayQuery<
  TData extends { [key: string]: SerializableValue }
>(data: TData[]) {
  const obj = data.find(d => typeof d === 'object' && d)
  if (!obj) {
    console.warn('No object provided in data', data)
    return sql.unsafe`(SELECT 1 AS value)`
  }
  const types = Object.keys(obj || {}).reduce((acc, key) => {
    if (typeof obj[key] === 'number')
      return { ...acc, [key]: sql.fragment`numeric` }
    if (typeof obj[key] === 'boolean')
      return { ...acc, [key]: sql.fragment`bool` }
    return { ...acc, [key]: sql.fragment`text` }
  }, {} as Record<keyof TData, FragmentSqlToken>)
  return sql.unsafe`SELECT
        ${sql.join(
          Object.keys(obj).map(
            key =>
              sql.fragment`(x.value->>${sql.literalValue(key)})::${
                types[key]
              } AS ${sql.identifier([key])}\n`
          ),
          sql.fragment`, `
        )} FROM JSONB_ARRAY_ELEMENTS(${sql.jsonb(data)}) x`
}

export function sqlWith<TData extends { [key: string]: SerializableValue }>(
  data: TData[] = []
) {
  const fragments = [
    {
      name: 'data',
      fragment: sql.fragment``
    }
  ] as {
    name: string
    fragment: FragmentSqlToken
  }[]
  const getQuery = (data: TData[]) => {
    const dataQuery = getSqlWithArrayQuery(data)
    const rootQuery = sql.unsafe`WITH data AS (${dataQuery})`
    return sql.unsafe`${rootQuery} ${sql.join(
      fragments.map(f => f.fragment),
      sql.fragment`\n`
    )}
        SELECT * FROM ${sql.identifier([
          fragments[fragments.length - 1]?.name || 'data'
        ])}`
  }
  const self = {
    as: (
      name: string,
      fn: (
        view: IdentifierSqlToken & {
          [key in keyof TData | '*']: IdentifierSqlToken
        }
      ) => any
    ) => {
      if (fragments.find(f => f.name === name)) {
        throw new Error(`Fragment with name ${name} already exists`)
      }
      fragments.push({
        name,
        fragment: sql.fragment`, ${sql.identifier([name])} AS (\n${fn(
          getColumnIdentifiers<TData>('data') as any
        )})`
      })
      return self
    },
    with: <TNewData extends { [key: string]: SerializableValue }>(
      name: string,
      data: TNewData[]
    ) => {
      if (fragments.find(f => f.name === name)) {
        throw new Error(`Fragment with name ${name} already exists`)
      }
      fragments.push({
        name,
        fragment: sql.fragment`, ${sql.identifier([
          name
        ])} AS (\n${getSqlWithArrayQuery(data)})`
      })
      return self
    },
    runDB: async (
      fn: (
        view: IdentifierSqlToken & {
          [key in keyof TData | '*']: IdentifierSqlToken
        }
      ) => any,
      options?: {
        /** This option only prints the queries without executing. Use it for debugging. */
        dryRun?: boolean
        db?: Pick<CommonQueryMethods, 'any' | 'transaction'>
        /** Automatically splits the data into groups of arrays with N elements. */
        limit?: number
        /** If you specify a confirmation function, the entire query will be run within a transaction.
         * If you return false, or throw an error, the transaction will be rolled back. */
        confirmation?: (results: any[]) => Promise<boolean> | boolean
      }
    ) => {
      const limit = options?.limit || 2000
      const queries = [] as QuerySqlToken[]
      self.as('userQuery', fn)
      for (let i = 0; i < data.length; i += limit) {
        queries.push(
          self.getQuery(undefined, {
            skip: i,
            take: limit
          })
        )
      }
      const db = options?.db
      const results = [] as any[]
      if (options?.dryRun) {
        for (const query of queries) {
          console.log(parseSqlQueryValues(query.sql, query.values))
        }
        return []
      } else {
        if (!db || !db.transaction) throw new Error('No db provided')
        await db.transaction(async tx => {
          for (const query of queries) {
            const result = await tx.any(query).catch(e => {
              console.error(parseSqlQueryValues(query.sql, query.values))
              throw e
            })
            results.push(...result)
          }
          if (
            typeof options?.confirmation === 'function' &&
            (await options.confirmation?.(results)) === false
          ) {
            throw new Error('Confirmation failed')
          }
        })
      }
      return results
    },
    getQuery: (
      fn?: (
        view: IdentifierSqlToken & {
          [key in keyof TData | '*']: IdentifierSqlToken
        }
      ) => any,
      options?: {
        take?: number
        skip?: number
      }
    ) => {
      if (fn) {
        self.as('userQuery' + (options?.skip || 0) + (options?.take || 0), fn)
      }
      return getQuery(
        data.slice(
          options?.skip || 0,
          (options?.skip || 0) + (options?.take || data.length)
        )
      )
    }
  }
  return self
}
