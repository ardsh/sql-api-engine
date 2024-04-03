import {
  SerializableValue,
  QuerySqlToken,
  FragmentSqlToken,
  CommonQueryMethods,
  sql
} from 'slonik'
import { parseSqlQueryValues } from '../shared'

function getSqlWithArrayQuery<
  TData extends { [key: string]: SerializableValue }
>(data: readonly TData[] | TData[]) {
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

/**
 * Usage:
 *
 * ```ts
 * const result = await sqlWith('data', [
 *     { id: 1, name: 'Alice' },
 *     { id: 2, name: 'Bob' }
 * ])
 * .as('filteredData', sql.unsafe`SELECT * FROM data
 *     WHERE data.name ILIKE 'BOB'`)
 * .as('updates', sql.unsafe`UPDATE public.users
 *     SET name = data.name
 *     FROM data
 *     WHERE users.id = data.id
 *     RETURNING users.*
 * `)
 * .runDB(sql.unsafe`SELECT
 *     ( SELECT COUNT(*) FROM updates ) AS "updatedCount"
 *     , (SELECT COUNT(*) FROM "filteredData" ) AS "filteredUsers"
 * `, {
 *    db: db,
 * })
 * ```
 *
 * @param name - The name of the fragment to be created. You can reference this fragment name in the later queries.
 * @param data - The array of objects to be inserted into the query.
 */
export function sqlWith<TData extends { [key: string]: SerializableValue }>(
  name: string,
  data: readonly TData[] | TData[] = []
) {
  const fragments = [
    {
      name,
      fragment: sql.fragment``
    }
  ] as {
    name: string
    fragment: FragmentSqlToken
  }[]
  const getQuery = (data: TData[]) => {
    const dataQuery = getSqlWithArrayQuery(data)
    const rootQuery = sql.unsafe`WITH ${sql.identifier([
      name
    ])} AS (${dataQuery})`
    return sql.unsafe`${rootQuery} ${sql.join(
      fragments.map(f => f.fragment),
      sql.fragment`\n`
    )}
        SELECT * FROM ${sql.identifier([
          fragments[fragments.length - 1]?.name || 'data'
        ])}`
  }
  const self = {
    as: (name: string, query: QuerySqlToken) => {
      if (fragments.find(f => f.name === name)) {
        throw new Error(`Fragment with name ${name} already exists`)
      }
      fragments.push({
        name,
        fragment: sql.fragment`, ${sql.identifier([name])} AS (\n${query})`
      })
      return self
    },
    /**
     * Adds array data to the query as if they were temporary tables.
     * @param name - The name of the fragment to be created. You can reference this fragment name in the later queries.
     * @param data - The array of objects to be inserted into the query.
     * @param emptyValue - Specify a dummy object to be inserted if the data array is empty.
     */
    with: <TNewData extends { [key: string]: SerializableValue }>(
      name: string,
      data: readonly TNewData[] | TNewData[],
      emptyValue?: TNewData
    ) => {
      if (fragments.find(f => f.name === name)) {
        throw new Error(`Fragment with name ${name} already exists`)
      }
      fragments.push({
        name,
        fragment: sql.fragment`, ${sql.identifier([
          name
        ])} AS (\n${getSqlWithArrayQuery(
          data.length || !emptyValue ? data : [emptyValue]
        )})`
      })
      return self
    },
    runDB: async (
      query: QuerySqlToken,
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
      self.as('userQuery', query)
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
            const result = await tx.any(query)
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
      query?: QuerySqlToken,
      options?: {
        take?: number
        skip?: number
      }
    ) => {
      if (query) {
        self.as(
          'userQuery' + (options?.skip || 0) + (options?.take || 0),
          query
        )
      }
      return getQuery(
        data.slice(
          options?.skip || 0,
          (options?.skip || 0) + (options?.take || data.length)
        )
      )
    },
    printOut: () => {}
  }
  return self
}
