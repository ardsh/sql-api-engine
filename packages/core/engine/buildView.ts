import {
  sql,
  ValueExpression,
  SqlFragment,
  IdentifierSqlToken,
  CommonQueryMethods,
  FragmentSqlToken,
  QuerySqlToken
} from 'slonik'
import { z } from 'zod'
import {
  arrayDynamicFilter,
  arrayFilter,
  booleanFilter,
  comparisonFilter,
  comparisonFilterType,
  dateFilter,
  dateFilterType,
  genericFilter,
  jsonbContainsFilter,
  stringFilter,
  stringFilterType
} from '../utils/sqlUtils'
import { notEmpty } from '../utils/zod'
import type { PromiseOrValue } from '../utils'

type LoadViewParameters<
  TFilter extends Record<string, any> = Record<never, any>,
  TFilterKey extends keyof TFilter = never,
  TFragment extends SqlFragment | QuerySqlToken = SqlFragment,
  TColumns extends string[] = never
> = {
  select: TFragment | TColumns
  orderBy?: SqlFragment
  groupBy?: SqlFragment
  take?: number
  skip?: number
  ctx?: any
  where?: RecursiveFilterConditions<{
    [x in TFilterKey]?: TFilter[x]
  }>
  db?: Pick<CommonQueryMethods, 'any'>
}

export type Interpretors<
  TFilter extends Record<string, any>,
  TFilterKey extends keyof TFilter = keyof TFilter extends Record<infer K, any>
    ? K extends string
      ? K
      : never
    : never,
  TContext = any
> = {
  [x in TFilterKey]?: {
    prefix?: string
    interpret: (
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
}

export type BuildView<
  TFilter extends Record<string, any> = Record<never, any>,
  TFilterKey extends keyof TFilter = never,
  TAliases extends string = '_main',
  TColumns extends string = never
> = {
  /**
   * Allows adding custom filters to the view
   * Multiple filters can be added at once
   * This is mainly to be used in conjunction with getFilters
   * WARNING: Do not use this otherwise, unless you know what you're doing.
   * Prefer using the other filter methods, especially addGenericFilter if you need more flexibility
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
      allFilters: TFilter & { [y in NoInfer<TNewFilterKey> | x]: any },
      context: any
    ) =>
      | Promise<SqlFragment | null | undefined | false>
      | SqlFragment
      | null
      | undefined
      | false
  }): BuildView<
    TNewFilter & TFilter,
    keyof TNewFilter | TFilterKey,
    TAliases,
    TColumns
  >
  /**
   * Allows filtering by string operators, e.g. "contains", "starts with", "ends with", etc.
   * @param field - The name of the filter - Can be a nested field, e.g. "user.name"
   * @param mapper - Optional if you want to use a different column name than the filter name
   */
  addStringFilter: <TKey extends Exclude<string, TFilterKey>>(
    field: TKey | TKey[],
    name?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken
          } & {
            [x: string]: IdentifierSqlToken
          },
          value?: z.infer<typeof stringFilterType>,
          allFilters?: TFilter,
          ctx?: any
        ) => SqlFragment)
  ) => BuildView<
    TFilter & { [x in TKey]?: z.infer<typeof stringFilterType> },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >
  /**
   * Allows filtering by comparison operators, e.g. "greater than", "less than", "between", "in", etc.
   * @param field - The name of the filter - Can be a nested field, e.g. "user.name"
   * @param mapper - Optional if you want to use a different column name than the filter name
   * @returns
   */
  addComparisonFilter: <TKey extends Exclude<string, TFilterKey>>(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken
          } & {
            [x: string]: IdentifierSqlToken
          },
          value?: z.infer<typeof comparisonFilterType>,
          allFilters?: TFilter,
          ctx?: any
        ) => SqlFragment),
    type?: string
  ) => BuildView<
    TFilter & { [x in TKey]?: z.infer<typeof comparisonFilterType> },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >
  /**
   * Allows filtering jsonb columns, using the @> operator to check if a JSONB column contains a certain value or structure.
   * ```
    view.addJsonContainsFilter('settings', () => sql.fragment`'user.user_settings'`)
    ```
    Allows for
    ```
      where: {
        settings: {
          notifications: true,
          theme: 'dark',
          nested: {
            value: 'something'
          }
        }
      }
    ```
   * */
  addJsonContainsFilter: <TKey extends Exclude<string, TFilterKey>>(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken
          } & {
            [x: string]: IdentifierSqlToken
          },
          value?: any,
          allFilters?: TFilter,
          ctx?: any
        ) => SqlFragment)
  ) => BuildView<
    TFilter & { [x in TKey]?: Parameters<typeof jsonbContainsFilter>[0] },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >
  /**
   * Allows filtering by date operators, e.g. "greater than", "less than" etc.
   * */
  addDateFilter: <TKey extends Exclude<string, TFilterKey>>(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken
          } & {
            [x: string]: IdentifierSqlToken
          },
          value?: z.infer<typeof dateFilterType>,
          allFilters?: TFilter,
          ctx?: any
        ) => SqlFragment)
  ) => BuildView<
    TFilter & { [x in TKey]?: z.infer<typeof dateFilterType> },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >
  /**
   * Loads data from the view
   * ```
   * const data = await usersView
   *  .options({ db }).load({
   *   select: sql.fragment`*`,
   *   where: {
   *     id: 1
   *   },
   * })
   * ```
   * */
  load: <
    TFragment extends SqlFragment | QuerySqlToken,
    TSelect extends TColumns = never,
    TObject extends any = [TSelect] extends [never]
      ? TFragment extends QuerySqlToken<infer T>
        ? z.infer<T>
        : any
      : Record<TSelect, any>
  >(
    args: LoadViewParameters<TFilter, TFilterKey, TFragment, TSelect[]>
  ) => Promise<readonly TObject[]>
  /**
   * Use this to specify aggregate functions as columns.
   * If any aggregates are ever selected, the group by clause is automatically added.
   * And all the non-aggregated columns are grouped by.
   * Usage:
   * ```ts
   * view.setAggregates({
   *   postsCount: sql.fragment`COUNT(posts.text) AS "postsCount"`
   * }).setColumns({
   *   name: sql.fragment`users.first_name || ' ' || users.last_name AS "name"`,
   *   month: sql.fragment`DATE_TRUNC('month', posts.created_at) AS "month"`,
   *   postsCount: sql.fragment`COUNT(*) AS "postsCount"`,
   *   largePostsCount: sql.fragment`COUNT(*) FILTER (WHERE LENGTH(posts.text) > 100) AS "largePostsCount"`,
   * })
   * .load({
   *   // Automatically returns posts grouped by month
   *   select: ['postsCount', 'month'],
   * })
   * ```
   */
  setAggregates: <TNewAggregates extends string = never>(aggregates: {
    [x in TNewAggregates]: SqlFragment
  }) => BuildView<TFilter, TFilterKey, TAliases, TColumns | TNewAggregates>
  setColumns: <TNewColumns extends string = never>(
    columns:
      | {
          [x in TNewColumns]: SqlFragment
        }
      | ArrayLike<TNewColumns>
  ) => BuildView<TFilter, TFilterKey, TAliases, TColumns | TNewColumns>
  /**
   * Sets the context for the view. This context can be used in various parts of the view lifecycle, such as in filters or constraints.
   * @param ctx - The context object. Each key-value pair in the object sets a context variable.
   * @returns The updated BuildView instance with the new context.
   * */
  context: <TContext extends Record<string, any>>(
    ctx?: TContext
  ) => BuildView<TFilter, TFilterKey, TAliases, TColumns>
  /**
   * Sets options for the view. Options can configure various aspects of how the view operates.
   * @param opts - The options object. Each key-value pair in the object sets an option.
   * @returns The updated BuildView instance with the new options.
   * */
  options: <TOptions extends Record<string, any>>(
    opts?: TOptions
  ) => BuildView<TFilter, TFilterKey, TAliases, TColumns>
  /**
   * Allows preprocessing the filters before they are interpreted
   * */
  setFilterPreprocess: (
    preprocess: (filters: TFilter, context: any) => Promise<TFilter> | TFilter
  ) => BuildView<TFilter, TFilterKey, TAliases, TColumns>
  /**
   * Sets table aliases. By default there's a `_main` alias for the main table that's referenced in the FROM fragment.
   *
   * These aliases can then be used in some of the filters, e.g.
   * ```ts
   * buildView`FROM users`
   * .addStringFilter('name', (table) => sql.fragment`COALESCE(${table._main}.first_name, ${table._main}.last_name)`)
   * ```
   *
   * would be translated to `COALESCE(users.first_name, users.last_name)`
   *
   * because `users` is the main table that's referred in the FROM clause.
   * */
  setTableAliases: <TNewAliases extends string>(
    table: Record<TNewAliases, string | IdentifierSqlToken>
  ) => BuildView<TFilter, TFilterKey, TAliases | TNewAliases, TColumns>
  /**
   * Allows filtering by boolean operators, e.g. "is true", "is false", "is null", etc.
   * @param field - The name of the filter - Can be a nested field, e.g. "user.name"
   * @param mapper - Optional if you want to use a different column name than the filter name
   * @returns
   * */
  addBooleanFilter: <TKey extends Exclude<string, TFilterKey>>(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken
          } & {
            [x: string]: IdentifierSqlToken
          },
          value?: boolean,
          allFilters?: TFilter,
          ctx?: any
        ) => SqlFragment),
    falseFragment?: SqlFragment
  ) => BuildView<
    TFilter & { [x in TKey]?: boolean },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >
  /**
   * Allows filtering by single or multiple string values
   * And returns all rows where the value is in the array
   * */
  addInArrayFilter: <
    TKey extends Exclude<string, TFilterKey>,
    TType extends 'text' | 'numeric' | 'integer' | 'bigint' = never,
    TValue = [TType] extends [never]
      ? string
      : TType extends 'numeric' | 'integer' | 'bigint'
      ? number
      : string
  >(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken
          } & {
            [x: string]: IdentifierSqlToken
          },
          value?: TValue | TValue[] | null,
          allFilters?: TFilter,
          ctx?: any
        ) => SqlFragment),
    type?: TType
  ) => BuildView<
    TFilter & { [x in TKey]?: TValue | TValue[] | null },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >
  /**
   * Use this to add a generic filter, that returns a SQL fragment
   * This filter won't be applied if the value is null or undefined
   * */
  addGenericFilter: <TKey extends Exclude<string, TFilterKey>, TNewFilter>(
    name: TKey,
    interpret: (
      filter: TNewFilter,
      allFilters: TFilter & { TKey: TNewFilter },
      context: any
    ) =>
      | Promise<SqlFragment | null | undefined | false>
      | SqlFragment
      | null
      | undefined
      | false
  ) => BuildView<
    TFilter & { [x in TKey]?: TNewFilter },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >
  /**
   * Returns the SQL query
   * @param args - The arguments to filter by
   * @returns - The SQL query fragment
   * */
  getWhereConditions(args: {
    where?: RecursiveFilterConditions<{
      [x in TFilterKey]?: TFilter[x]
    }>
    ctx?: any
    options?: FilterOptions
  }): Promise<SqlFragment[]>
  getWhereFragment(args: {
    where?: RecursiveFilterConditions<{
      [x in TFilterKey]?: TFilter[x]
    }>
    ctx?: any
    options?: FilterOptions
  }): Promise<FragmentSqlToken>
  setConstraints: (
    constraints: (
      ctx: any
    ) => PromiseOrValue<SqlFragment | SqlFragment[] | null | undefined>
  ) => BuildView<TFilter, TFilterKey, TAliases, TColumns>
  getFromFragment(ctx?: any): FragmentSqlToken
  /**
   * Returns all filters that have been added to the view
   * @param options - Options for configuring the filters
   */
  getFilters<
    TInclude extends Extract<TFilterKey, string> | `${string}*` = never,
    TExclude extends Extract<TFilterKey, string> | `${string}*` = never,
    TRealInclude extends Extract<
      TFilterKey,
      string
    > = TInclude extends `${infer K}*`
      ? Extract<TFilterKey, `${K}${string}`>
      : Extract<TInclude, Extract<TFilterKey, string>>,
    TRealExclude extends Extract<
      TFilterKey,
      string
    > = TExclude extends `${infer K}*`
      ? Extract<TFilterKey, `${K}${string}`>
      : Extract<TExclude, Extract<TFilterKey, string>>,
    TPrefix extends string = '',
    TRealPrefix extends string = TPrefix extends `${string}.`
      ? TPrefix
      : `${TPrefix}.`
  >(options?: {
    table?: TPrefix
    include?: readonly TInclude[]
    exclude?: readonly TExclude[]
  }): {
    [x in TFilterKey extends TRealExclude
      ? never
      : [TRealInclude] extends [never]
      ? // ([TRealInclude] extends [never] ? TFilterKey : TFilterKey)
        TFilterKey extends `${TRealPrefix}${string}`
        ? TFilterKey
        : `${TRealPrefix}${Extract<TFilterKey, string>}`
      : TFilterKey extends `${TRealPrefix}${string}`
      ? Extract<TFilterKey, TRealInclude>
      : `${TRealPrefix}${Extract<TFilterKey, TRealInclude>}`]?: (
      filter: TFilter[x extends `${TRealPrefix}${infer K}`
        ? K extends TFilterKey
          ? K
          : x
        : x],
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

type FilterOptions = {
  orEnabled?: boolean
  /** If true, auth constraints aren't considered. Only use if you're already adding them in query loaders */
  bypassConstraints?: boolean
}

type Options = FilterOptions & {
  db?: Pick<CommonQueryMethods, 'any'>
}

export const buildView = (
  parts: readonly string[],
  ...values: readonly (
    | ValueExpression
    | ((ctx: Record<string, any>) => ValueExpression)
  )[]
) => {
  const fromFragment = sql.fragment(
    parts,
    ...values.map(v => (typeof v === 'function' ? v({}) ?? null : v))
  )
  if (!fromFragment.sql.match(/^\s*FROM/i)) {
    throw new Error('First part of view must be FROM')
  }
  let constraints = null as
    | ((
        ctx: any
      ) => PromiseOrValue<SqlFragment | SqlFragment[] | null | undefined>)
    | null
  const context = {} as Record<string, any>
  const options = {} as Options
  const allColumns = {} as Record<string, SqlFragment | IdentifierSqlToken>
  const allAggregates = {} as Record<string, SqlFragment>
  const preprocessors = [] as ((
    filters: any,
    context: any
  ) => Promise<any> | any)[]
  const config = {
    table: fromFragment.sql.match(/^FROM\s*(\w+)/i)?.[1],
    aliases: new Map<string, string>()
  }
  const identifierProxy = new Proxy({} as any, {
    get(target, property) {
      if (property === '_main')
        return sql.identifier([
          config.aliases.get(property) || config.table || ''
        ])
      return sql.identifier([
        config.aliases.get(property as string) || (property as string)
      ])
    }
  })
  if (!config.table) {
    config.table = fromFragment.sql.match(/(AS|\))\s+(\w+)\s*$/i)?.[2]
  }
  const interpreters = {} as Interpretors<Record<string, any>>

  const getWhereConditions = async (
    filters: RecursiveFilterConditions<any>,
    ctx?: any,
    opts?: FilterOptions
  ) => {
    const realContext = {
      ...context,
      ...ctx
    }
    const realOptions = {
      ...options,
      ...opts
    }
    const postprocessedFilters = await preprocessors
      .slice(-1)
      .reduce(async (acc, preprocessor) => {
        const filters: any = await acc
        return preprocessor(filters, realContext)
      }, filters)
    const authConditions =
      constraints && !realOptions?.bypassConstraints
        ? await constraints(realContext)
        : null
    const auth = Array.isArray(authConditions)
      ? authConditions
      : [authConditions].filter(notEmpty)
    const conditions = await interpretFilter(
      postprocessedFilters || filters,
      interpreters as any,
      realContext,
      realOptions
    )
    return [...auth, ...conditions]
  }
  const getWhereFragment = async (
    filters: RecursiveFilterConditions<any>,
    context?: any,
    options?: FilterOptions
  ) => {
    const conditions = await getWhereConditions(filters, context, options)
    return conditions.length
      ? sql.fragment`WHERE \n(${sql.join(
          conditions,
          sql.fragment`)\n AND (`
        )})\n`
      : sql.fragment`WHERE TRUE`
  }

  const getFromFragment = (ctx = {}) => {
    return sql.fragment(
      parts,
      ...values.map(v => (typeof v === 'function' ? v(ctx) ?? null : v))
    )
  }

  const addFilter = (
    interpreter: (
      value: any,
      field: FragmentSqlToken,
      ...otherArgs: any[]
    ) => any,
    fields: string | string[],
    mapper?:
      | SqlFragment
      | ((
          table: IdentifierSqlToken | Record<string, IdentifierSqlToken>,
          value?: any,
          allFilters?: any,
          context?: any
        ) => SqlFragment),
    ...otherArgs: any[]
  ) => {
    if (mapper && Array.isArray(fields) && fields.length > 1) {
      throw new Error(
        'If you specify a mapper function you cannot have multiple filter keys'
      )
    }
    return self.addFilters(
      (Array.isArray(fields) ? fields : [fields]).reduce((acc, key) => {
        return {
          ...acc,
          [key]: (value: any, allFilters: any, ctx: any, key: string) => {
            const keys = key.split('.')
            if (keys.length > 2) {
              // Ignore middle keys (earlier prefixes), only first and last matter
              keys.splice(1, keys.length - 2)
            }
            const identifier = mapper
              ? // Try to get the table name from the 2nd to last prefix if it exists, if not then use main table
                typeof mapper === 'function'
                ? mapper(identifierProxy, value, allFilters, ctx)
                : mapper
              : config.table && keys.length <= 1
              ? (sql.identifier([config.table, ...keys.slice(-1)]) as any)
              : (sql.identifier([...keys.slice(-2)]) as any)
            return interpreter(value, identifier, ...otherArgs)
          }
        }
      }, {})
    )
  }
  const self = {
    ...fromFragment,
    getFromFragment,
    addFilters(filters: any) {
      Object.assign(interpreters, filters)
      return self
    },
    setTableAliases(newAliases: Record<string, string | IdentifierSqlToken>) {
      for (const [key, value] of Object.entries(newAliases)) {
        config.aliases.set(key, value as string)
      }
      return self
    },
    setFilterPreprocess(
      preprocess: (filters: any, context: any) => Promise<any> | any
    ) {
      preprocessors.push(preprocess)
      return self
    },
    getFilters(options?: any) {
      let prefix = options?.table || ''
      if (prefix && !prefix.endsWith('.')) {
        prefix += '.'
      }
      const exclude = (options?.exclude || []) as string[]
      const include = (options?.include || []) as string[]
      const filters = {} as any
      for (const key of Object.keys(interpreters)) {
        // exclude may have * wildcards that exclude all filters that start with the prefix
        if (
          exclude.some(ex =>
            ex.endsWith('*') ? key.startsWith(ex.replace('*', '')) : ex === key
          )
        ) {
          continue
        }
        const isIncluded =
          !include.length ||
          include.some(ex =>
            ex.endsWith('*') ? key.startsWith(ex.replace('*', '')) : ex === key
          )
        if (isIncluded) {
          filters[prefix + key.replace(prefix, '')] = {
            interpret:
              (interpreters as any)[key]?.interpret ||
              (interpreters as any)[key],
            prefix: key.startsWith(prefix) ? '' : prefix
          }
        }
      }
      return filters
    },
    addStringFilter: (keys: string | string[], name?: any) => {
      return addFilter(stringFilter, keys, name)
    },
    addComparisonFilter: (
      keys: string | string[],
      name?: any,
      ...otherArgs: any[]
    ) => {
      return addFilter(comparisonFilter, keys, name, ...otherArgs)
    },
    addBooleanFilter: (
      keys: string | string[],
      name?: any,
      ...otherArgs: any[]
    ) => {
      return addFilter(booleanFilter, keys, name, ...otherArgs)
    },
    addJsonContainsFilter: (keys: string | string[], name?: any) => {
      return addFilter(jsonbContainsFilter, keys, name)
    },
    addDateFilter: (keys: string | string[], name?: any) => {
      return addFilter(dateFilter, keys, name)
    },
    addInArrayFilter: (keys: string | string[], name?: any, type?: string) => {
      const arrFilter = type ? arrayDynamicFilter(type) : arrayFilter
      return addFilter(arrFilter, keys, name)
    },
    addGenericFilter: (name: string, interpret?: any) => {
      return addFilter(genericFilter, name, (table, value, ...args) => {
        return interpret(value, ...args)
      })
    },
    options: (opts?: Options) => {
      if (opts && typeof opts === 'object') {
        for (const [key, value] of Object.entries(opts)) {
          options[key as keyof Options] = value as any
        }
      }
      return self
    },
    context: (ctx?: any) => {
      if (ctx && typeof ctx === 'object') {
        for (const [key, value] of Object.entries(ctx)) {
          context[key] = value
        }
      }
      return self
    },
    setConstraints(
      cons: (
        ctx: any
      ) => PromiseOrValue<SqlFragment | SqlFragment[] | null | undefined>
    ) {
      constraints = cons
      return self
    },
    getWhereConditions: async (args: any) => {
      return getWhereConditions(args.where, args.ctx, args.options)
    },
    load: async (args: LoadViewParameters) => {
      const db = args.db || options.db
      if (!db) {
        throw new Error(
          'Database is not set. Please set the database by calling options({ db: db })'
        )
      }
      if (args.take === 0) return []
      const realContext = {
        ...context,
        ...args.ctx
      }
      const whereFragment = args.where
        ? await getWhereFragment(args.where, realContext, options)
        : sql.fragment``
      const selectFrag = Array.isArray(args.select)
        ? sql.fragment`SELECT ${sql.join(
            args.select
              .map(key => allColumns[key])
              .filter((frag: any) => {
                return frag && (frag.sql || frag.type)
              }),
            sql.fragment`\n, `
          )}`
        : args.select
      let groupBy = args.groupBy
        ? sql.fragment`GROUP BY ${args.groupBy}`
        : sql.fragment``
      const selectedAggregates =
        (Array.isArray(args.select) &&
          args.select.map(key => allAggregates[key]).filter(notEmpty)) ||
        []
      if (args.groupBy && selectedAggregates.length) {
        throw new Error('Cannot specify groupBy when selecting aggregates')
      }
      if (selectedAggregates.length && Array.isArray(args.select)) {
        const nonAggregated = args.select
          .map((key, idx) => [key, idx])
          .filter(([key]) => !allAggregates[key])
          .map(([key, idx]) => sql.fragment([idx + 1]))
        groupBy = sql.fragment`GROUP BY ${sql.join(
          nonAggregated,
          sql.fragment`, `
        )}`
      }
      const query = sql.unsafe`${selectFrag} ${getFromFragment(
        realContext
      )} ${whereFragment}
      ${groupBy}
      ${args.orderBy ? sql.fragment`ORDER BY ${args.orderBy}` : sql.fragment``}
      ${
        typeof args.take === 'number' && args.take > 0
          ? sql.fragment`LIMIT ${args.take}`
          : sql.fragment``
      }
      ${
        typeof args.skip === 'number' && args.skip > 0
          ? sql.fragment`OFFSET ${args.skip}`
          : sql.fragment``
      }
      `
      return db.any(query)
    },
    setAggregates: (aggregates: Record<string, SqlFragment>) => {
      if (aggregates && typeof aggregates === 'object') {
        Object.keys(aggregates).forEach(key => {
          if (aggregates[key]) {
            allColumns[key] = aggregates[key]
            allAggregates[key] = aggregates[key]
          }
        })
      } else {
        throw new Error('setAggregates must be called with an object')
      }
      return self
    },
    setColumns: (columns: string[] | Record<string, SqlFragment>) => {
      if (Array.isArray(columns)) {
        for (const column of columns) {
          if (typeof column === 'string') {
            allColumns[column] = sql.identifier([column])
          }
        }
      } else if (typeof columns === 'object') {
        Object.keys(columns).forEach(
          key => columns[key] && (allColumns[key] = columns[key])
        )
      }
      return self
    },
    getWhereFragment: async (args: any) => {
      return getWhereFragment(args.where, args.ctx, args.options)
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
  context?: any,
  options?: FilterOptions
) => {
  const conditions = [] as SqlFragment[]
  const addCondition = (item: SqlFragment | null) =>
    item && conditions.push(item)
  for (const key of Object.keys(filter)) {
    const interpreter = interpreters[key as never] as any
    const condition = await (interpreter?.interpret || interpreter)?.(
      filter[key as never],
      filter as TFilter,
      context,
      key
    )
    if (condition) {
      addCondition(condition)
    }
  }
  if (filter.OR?.length) {
    if (!options?.orEnabled) {
      throw new Error(
        'OR filters are not enabled. Please enable by passing { orFilterEnabled: true } in the options'
      )
    }
    const orConditions = await Promise.all(
      filter.OR.map(async or => {
        const orFilter = await interpretFilter(
          or,
          interpreters,
          context,
          options
        )
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
        const andFilter = await interpretFilter(
          and,
          interpreters,
          context,
          options
        )
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
    const notFilter = await interpretFilter(
      filter.NOT,
      interpreters,
      context,
      options
    )
    if (notFilter.length) {
      addCondition(
        sql.fragment`NOT (${sql.join(notFilter, sql.fragment`) AND (`)})`
      )
    }
  }

  return conditions
}

const sqlWithBuild = Object.assign(sql, {
  buildView
}) as typeof sql & {
  buildView: typeof buildView
}

export { sqlWithBuild as sql }
