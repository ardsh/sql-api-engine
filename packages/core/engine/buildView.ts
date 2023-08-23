import {
  sql,
  ValueExpression,
  SqlFragment,
  QuerySqlToken,
} from 'slonik'
import { z } from 'zod'
import {
  booleanFilter,
  comparisonFilter,
  comparisonFilterType,
  stringFilter,
  stringFilterType
} from '../utils/sqlUtils'
import { notEmpty } from '../shared/utils'

/*
Inner JOIN can compose filters, each view having its own inner filters

SELECT * FROM (SELECT * FROM posts
WHERE posts.title = 'bob')
INNER JOIN (
SELECT * FROM users
WHERE users.id='abc'
) ON users.id = posts.author

This is then equivalent to filtering outside.

Other features:
- Various adapters for common API servers (express, fastify, trpc etc.)
- Pagination (including cursor pagination?)
- Sorting, Filtering, Aggregation (group by)
- Caching (using plugins)
- Virtual fields
- Partial selection. Including nested selection, like posts.title
- Streaming responses, ability to send just rows without virtual fields, then send the complete response
- Support for multiple databases (postgres, mysql, sqlite, mssql, oracle, etc.). May mean the query builder engine has to be adapted for each one.

A fundamental problem is the naming conflicts in filters. It might be solved via namespaced filters, e.g. each view having its own custom filters.
But what about complex filters, that involve multiple views? Maybe just don't allow them, and only views are allowed to have filters.
Meaning if you want to use two tables, you have to create a view for them first, and then add those specific filters.
But THEN, you have to be able to reuse the filters from the basic views that also used those two tables.

Maybe you create a view like
```
buildView`SELECT * FROM posts INNER JOIN users ON users.id = posts.author`
.addFilters(postsView.getFilters('posts.'))
.addFilters(usersView.getFilters('users.'))// Adds a prefix to all filters to avoid conflicts
```

It is important to always require the table/view name be specified in all SQL fragments.
*/

export type Interpretors<
  TFilter extends Record<string, any>,
  TFilterKey extends keyof TFilter = keyof TFilter extends Record<infer K, any>
    ? K extends string
      ? K
      : never
    : never,
  TContext = any
> = {
  [x in TFilterKey]?: (
    filter: TFilter[x],
    allFilters: TFilter,
    context: TContext
  ) =>
    | Promise<SqlFragment | null | undefined | false>
    | SqlFragment
    | null
    | undefined
    | false
}

type BuildView<
  TFilter extends Record<string, any> = Record<never, any>,
  TFilterKey extends keyof TFilter = never
> = {
  /**
   * Allows adding custom filters to the view
   * Multiple filters can be added at once
   * @param filters - The filters to add
   */
  addFilters<
    TNewFilter extends Record<string, any> = Record<never, any>,
    TNewFilterKey extends keyof TNewFilter = keyof TNewFilter extends Record<
      infer K,
      any
    >
      ? K extends string
        ? K
        : never
      : never
  >(filters: {
    [x in TNewFilterKey]?: (
      filter: TNewFilter[x],
      allFilters: TFilter & TNewFilter,
      context: any
    ) =>
      | Promise<SqlFragment | null | undefined | false>
      | SqlFragment
      | null
      | undefined
      | false
  }): BuildView<TNewFilter & TFilter, keyof TNewFilter | TFilterKey>
  /**
   * Allows filtering by string operators, e.g. "contains", "starts with", "ends with", etc.
   * @param field - The name of the filter - Can be a nested field, e.g. "user.name"
   * @param mapper - Optional if you want to use a different column name than the filter name
   */
  addStringFilter: <TKey extends string>(
    field: TKey,
    mapper?: (key: any) => SqlFragment
  ) => BuildView<
    TFilter & { [x in TKey]?: z.infer<typeof stringFilterType> },
    keyof TFilter | TKey
  >
  /**
   * Allows filtering by comparison operators, e.g. "greater than", "less than", "between", "in", etc.
   * @param field - The name of the filter - Can be a nested field, e.g. "user.name"
   * @param mapper - Optional if you want to use a different column name than the filter name
   * @returns
   */
  addComparisonFilter: <TKey extends string>(
    field: TKey,
    mapper?: (key: any) => SqlFragment
  ) => BuildView<
    TFilter & { [x in TKey]?: z.infer<typeof comparisonFilterType> },
    keyof TFilter | TKey
  >
  /**
   * Allows filtering by boolean operators, e.g. "is true", "is false", "is null", etc.
   * @param field - The name of the filter - Can be a nested field, e.g. "user.name"
   * @param mapper - Optional if you want to use a different column name than the filter name
   * @returns
   */
  addBooleanFilter: <TKey extends string>(
    field: TKey,
    mapper?: (key: any) => SqlFragment
  ) => BuildView<TFilter & { [x in TKey]?: boolean }, keyof TFilter | TKey>
  /**
   * Returns the SQL query
   * @param args - The arguments to filter by
   * @returns - The SQL query fragment
   * */
  getQuery(args: {
    where?: RecursiveFilterConditions<{
      [x in TFilterKey]?: TFilter[x]
    }>
  }): Promise<QuerySqlToken>
  getFilters<TPrefix extends string>(prefix: TPrefix): {
    [x in TFilterKey extends `${TPrefix}${string}` ? TFilterKey : `${TPrefix}${Extract<TFilterKey, string>}`]?:
    (
      filter: TFilter[x extends `${TPrefix}${infer K}` ? K extends TFilterKey ? K : x : x],
      allFilters: any,
      context: any
    ) =>
      | Promise<SqlFragment | null | undefined | false>
      | SqlFragment
      | null
      | undefined
      | false
  }
} & SqlFragment

export const buildView = (
  parts: readonly string[],
  ...values: readonly ValueExpression[]
) => {
  if (!parts[0]?.match(/^\s*FROM/i)) {
    throw new Error('First part of view must be FROM')
  }
  const table = parts[0].match(/^\s*FROM\s+(\S+)/i)?.[1];
  const fromFragment = sql.fragment(parts, ...values)
  const interpreters = {} as Interpretors<Record<string, any>>

  const getWhereFragment = async (
    filters: RecursiveFilterConditions<any>,
    context?: any
  ) => {
    const conditions = await interpretFilter(filters, interpreters as any)
    return conditions?.length
      ? sql.fragment`(${sql.join(conditions, sql.fragment`)\n AND (`)})\n`
      : sql.fragment`TRUE`
  }

  const self = {
    ...fromFragment,
    addFilters(filters: any) {
      Object.assign(interpreters, filters)
      return self
    },
    getFilters(prefix: string) {
      const filters = {} as any
      for (const key of Object.keys(interpreters)) {
        filters[prefix + key.replace(prefix, '')] = (interpreters as any)[key];
      }
      return filters
    },
    addStringFilter: (key: string, mapper?: any) => {
      return self.addFilters({
        [key]: (...args: any) =>
          stringFilter(
            args[0],
            mapper
              ? mapper(...args)
              : (sql.identifier([...key.split('.')]) as any)
          )
      })
    },
    addComparisonFilter: (key: string, mapper?: any) => {
      return self.addFilters({
        [key]: (...args: any) =>
          comparisonFilter(
            args[0],
            mapper
              ? mapper(...args)
              : (sql.identifier([...key.split('.')]) as any)
          )
      })
    },
    addBooleanFilter: (key: string, mapper?: any) => {
      return self.addFilters({
        [key]: (...args: any) =>
          booleanFilter(
            args[0],
            mapper
              ? mapper(...args)
              : (sql.identifier([...key.split('.')]) as any)
          )
      })
    },
    getQuery: async (args: any) => {
      return sql.unsafe`SELECT * ${fromFragment} WHERE ${await getWhereFragment(
        args.where,
        args.ctx
      )}`
    }
  }
  return self as BuildView
}

export type RecursiveFilterConditions<
  TFilter,
  TDisabled extends 'AND' | 'OR' | 'NOT' = never
> = TFilter &
  Omit<
    {
      AND?: RecursiveFilterConditions<TFilter>[]
      OR?: RecursiveFilterConditions<TFilter>[]
      NOT?: RecursiveFilterConditions<TFilter>
    },
    TDisabled
  >

const interpretFilter = async <TFilter extends Record<string, any>>(
  filter: RecursiveFilterConditions<TFilter>,
  interpreters: Interpretors<TFilter>,
  context?: any
) => {
  const conditions = [] as SqlFragment[]
  const addCondition = (item: SqlFragment | null) =>
    item && conditions.push(item)
  for (const key of Object.keys(filter)) {
    const interpreter = interpreters[key as never] as any
    const condition = await interpreter?.(
      filter[key as never],
      filter as TFilter,
      context
    )
    if (condition) {
      addCondition(condition)
    }
  }
  if (filter.OR?.length) {
    const orConditions = await Promise.all(
      filter.OR.map(async or => {
        const orFilter = await interpretFilter(or, interpreters, context)
        return orFilter?.length
          ? sql.fragment`(${sql.join(orFilter, sql.fragment`) AND (`)})`
          : null
      })
    ).then(filters => filters.filter(notEmpty))
    if (orConditions?.length) {
      addCondition(
        sql.fragment`(${sql.join(orConditions, sql.fragment`) OR (`)})`
      )
    }
  }
  if (filter.AND?.length) {
    const andConditions = await Promise.all(
      filter.AND.map(async and => {
        const andFilter = await interpretFilter(and, interpreters, context)
        return andFilter?.length
          ? sql.fragment`(${sql.join(andFilter, sql.fragment`) AND (`)})`
          : null
      })
    ).then(filters => filters.filter(notEmpty))
    if (andConditions?.length) {
      addCondition(
        sql.fragment`(${sql.join(andConditions, sql.fragment`) AND (`)})`
      )
    }
  }
  if (filter.NOT) {
    const notFilter = await interpretFilter(filter.NOT, interpreters, context)
    if (notFilter.length) {
      addCondition(
        sql.fragment`NOT (${sql.join(notFilter, sql.fragment`) AND (`)})`
      )
    }
  }

  return conditions
}
