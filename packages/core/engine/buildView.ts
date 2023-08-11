import { sql, ValueExpression, SqlFragment, QuerySqlToken, CommonQueryMethods } from "slonik";
import { z } from "zod";
import {
    booleanFilter,
    comparisonFilter,
    comparisonFilterType,
    stringFilter,
    stringFilterType,
} from "../utils/sqlUtils";
import { notEmpty } from "../shared/utils";

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

*/

export type Interpretors<
    TFilter extends Record<string, any>,
    TFilterKey extends keyof TFilter= keyof TFilter extends Record<infer K, any> ? K extends string ? K : never : never,
    TContext = any
> = {
    [x in TFilterKey]?: (
        filter: TFilter[x],
        allFilters: TFilter,
        context: TContext
    ) => Promise<SqlFragment | null | undefined | false> | SqlFragment | null | undefined | false;
};

type BuildView<
    TFilter extends Record<string, any>=Record<never, any>,
    TFilterKey extends keyof TFilter = keyof TFilter extends Record<infer K, any> ? K extends string ? K : never : never
> = {
    addFilters<
        TNewFilter extends Record<string, any>=Record<never, any>,
        TNewFilterKey extends keyof TNewFilter = keyof TNewFilter extends Record<infer K, any> ? K extends string ? K : never : never
    >(filters: {
        [x in TNewFilterKey]?: (
            filter: TNewFilter[x],
            allFilters: TFilter,
            context: any
        ) => Promise<SqlFragment | null | undefined | false> | SqlFragment | null | undefined | false;
    }): BuildView<TNewFilter, TNewFilterKey>;
    addStringFilter: <TKey extends string>(field: TKey, mapper?: (key: any) => SqlFragment) => BuildView<TFilter & { [x in TKey]?: z.infer<typeof stringFilterType> }, keyof TFilter | TKey>;
    addComparisonFilter: <TKey extends string>(field: TKey, mapper?: (key: any) => SqlFragment) => BuildView<TFilter & { [x in TKey]?: z.infer<typeof comparisonFilterType> }, keyof TFilter | TKey>;
    addBooleanFilter: <TKey extends string>(field: TKey, mapper?: (key: any) => SqlFragment) => BuildView<TFilter & { [x in TKey]?: boolean }, keyof TFilter | TKey>;
    getQuery(args: {
        where?: RecursiveFilterConditions<{
            [x in TFilterKey]?: TFilter[x];
        }>,
    }): Promise<QuerySqlToken>;
} & SqlFragment;

export const buildView = (parts: readonly string[], ...values: readonly ValueExpression[]) => {
    if (!parts[0]?.match(/^\s*FROM/i)) {
        throw new Error("First part of view must be FROM");
    }
    const fromFragment = sql.fragment(parts, ...values);
    const interpreters = {} as Interpretors<Record<string, any>>;

    const getWhereFragment = async (filters: RecursiveFilterConditions<any>, context?: any) => {
        const conditions = await interpretFilter(filters, interpreters as any);
        return conditions?.length
            ? sql.fragment`(${sql.join(conditions, sql.fragment`)\n AND (`)})\n`
            : sql.fragment`TRUE`;
    }

    const self = {
        ...fromFragment,
        addFilters(filters: any) {
            Object.assign(interpreters, filters);
            return self;
        },
        addStringFilter: (key: string, mapper?: any) => {
            return self.addFilters({
                [key]: (...args: any) => stringFilter(args[0], mapper ? mapper(...args) : sql.identifier([key]) as any)
            });
        },
        addComparisonFilter: (key: string, mapper?: any) => {
            return self.addFilters({
                [key]: (...args: any) => comparisonFilter(args[0], mapper ? mapper(...args) : sql.identifier([key]) as any)
            });
        },
        addBooleanFilter: (key: string, mapper?: any) => {
            return self.addFilters({
                [key]: (...args: any) => booleanFilter(args[0], mapper ? mapper(...args) : sql.identifier([key]) as any)
            });
        },
        getQuery: async (args: any) => {
            return sql.unsafe`SELECT * ${fromFragment} ${sql.identifier`blabla`} WHERE ${await getWhereFragment(args.where, args.ctx)}`;
        },
    }
    return self as BuildView<any>;
}



export type RecursiveFilterConditions<TFilter, TDisabled extends "AND" | "OR" | "NOT"=never> = TFilter & Omit<{
    AND?: RecursiveFilterConditions<TFilter>[];
    OR?: RecursiveFilterConditions<TFilter>[];
    NOT?: RecursiveFilterConditions<TFilter>;
}, TDisabled>;

const interpretFilter = async <TFilter extends Record<string, any>>(filter: RecursiveFilterConditions<TFilter>, interpreters: Interpretors<TFilter>, context?: any) => {
    const conditions = [] as SqlFragment[];
    const addCondition = (item: SqlFragment | null) =>
        item && conditions.push(item);
    for (const key of Object.keys(filter)) {
        const interpreter = interpreters[key as never] as any;
        const condition = await interpreter?.(
            filter[key as never],
            filter as TFilter,
            context
        );
        if (condition) {
            addCondition(condition);
        }
    }
    if (filter.OR?.length) {
        const orConditions = await Promise.all(filter.OR.map(async (or) => {
            const orFilter = await interpretFilter(or, interpreters, context);
            return orFilter?.length
                ? sql.fragment`(${sql.join(
                      orFilter,
                      sql.fragment`) AND (`
                  )})`
                : null;
        })).then(filters => filters.filter(notEmpty));
        if (orConditions?.length) {
            addCondition(
                sql.fragment`(${sql.join(
                    orConditions,
                    sql.fragment`) OR (`
                )})`
            );
        }
    }
    if (filter.AND?.length) {
        const andConditions = await Promise.all(filter.AND.map(async (and) => {
            const andFilter = await interpretFilter(and, interpreters, context);
            return andFilter?.length
                ? sql.fragment`(${sql.join(
                      andFilter,
                      sql.fragment`) AND (`
                  )})`
                : null;
        })).then(filters => filters.filter(notEmpty));
        if (andConditions?.length) {
            addCondition(
                sql.fragment`(${sql.join(
                    andConditions,
                    sql.fragment`) AND (`
                )})`
            );
        }
    }
    if (filter.NOT) {
        const notFilter = await interpretFilter(filter.NOT, interpreters, context);
        if (notFilter.length) {
            addCondition(
                sql.fragment`NOT (${sql.join(
                    notFilter,
                    sql.fragment`) AND (`
                )})`
            );
        }
    }

    return conditions;
};
