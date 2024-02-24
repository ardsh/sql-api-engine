import { sql, CommonQueryMethods, SqlFragment } from 'slonik'
import type { BuildView } from './buildView'
import type { PromiseOrValue } from '../utils'
import { notEmpty } from '../shared'

type NoInfer<T> = [T][T extends any ? 0 : never]

/**
 * A function that uses the postgres FILTER WHERE clause to return multiple counts
 * ```
 * const userView = buildView`FROM users`
 *   .addStringFilter('name')
 *   .addBooleanFilter('is_active')
 * const loader = makeCountLoader({
 *  view: userView,
 *  counts: {
 *   active: { is_active: true },
 *   inactive: { is_active: false }
 *   distinct_names: { count: sql.fragment`DISTINCT users.name` }
 *  },
 *  db,
 * });
 * const data = await loader.load({
 *  select: ['active', 'inactive', 'distinct_names']
 * });
 * ```
 * Should return
 * ```
 * {
 *   active: 10,
 *   inactive: 5,
 *   distinct_names: 7
 * }
 * ```
 * By running a query like
 * ```
 * SELECT
 *  COUNT(*) FILTER (WHERE is_active = TRUE) AS active,
 *  COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive,
 *  COUNT(DISTINCT users.name) AS distinct_names
 * FROM users
 * */
export function makeCountLoader<
  TView extends BuildView<TFilterTypes, keyof TFilterTypes>,
  TFilterTypes extends Record<string, any> = TView extends BuildView<infer T>
    ? T
    : never,
  TCounts extends Record<
    string,
    Partial<NoInfer<TFilterTypes>> & { count?: SqlFragment }
  > = never,
  TSelectable extends Exclude<keyof TCounts, number | symbol> = Exclude<
    keyof TCounts,
    number | symbol
  >
>({
  view,
  counts,
  constraints,
  db
}: {
  view: TView
  /** Allows counting only distinct items using a count fragment. E.g.
   * ```
   *   distinct_birthdays: { count: sql.fragment`DISTINCT users.date_of_birth` }
   * ```
   * */
  counts: TCounts
  constraints?: (
    ctx: any
  ) => PromiseOrValue<SqlFragment | SqlFragment[] | null | undefined>
  db?: Pick<CommonQueryMethods, 'any'>
}) {
  return {
    async load<TSelect extends TSelectable>(args?: {
      select?: TSelect | TSelect[]
      ctx?: any
    }): Promise<Record<TSelect, number>> {
      const auth = (await constraints?.(args?.ctx)) ?? []
      const conditions = Array.isArray(auth) ? auth : [auth].filter(notEmpty)
      const query = sql.unsafe`SELECT
                ${sql.join(
                  (
                    await Promise.all(
                      Object.entries(counts).map(async ([key, filter]) => {
                        if (
                          args?.select &&
                          !args.select.includes(key as TSelect)
                        ) {
                          return null
                        }
                        const whereFragment = filter
                          ? await view.getWhereFragment({
                              where: filter,
                              options: {
                                orEnabled: true
                              },
                              ctx: args?.ctx
                            })
                          : sql.fragment`WHERE TRUE`
                        return sql.unsafe`COUNT(${
                          filter?.count ?? sql.fragment`*`
                        }) FILTER (${whereFragment}) AS ${sql.identifier([
                          key
                        ])}`
                      })
                    )
                  ).filter(Boolean),
                  sql.fragment`,\n `
                )}
            ${view.getFromFragment()}
            ${
              conditions.length
                ? sql.fragment`WHERE (${sql.join(
                    conditions,
                    sql.fragment`) AND (`
                  )})`
                : sql.fragment``
            }`
      // return query as any;
      return db?.any(query).then(res => res?.[0]) ?? ({} as any)
    }
  }
}
