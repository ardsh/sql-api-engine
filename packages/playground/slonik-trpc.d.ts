import { CommonQueryMethods } from 'slonik';
import { FragmentSqlToken } from 'slonik';
import { IdentifierSqlToken } from 'slonik';
import { PrimitiveValueExpression } from 'slonik';
import { QuerySqlToken } from 'slonik';
import type { SerializableValue } from 'slonik';
import { sql } from 'slonik';
import { SqlFragment } from 'slonik';
import { ValueExpression } from 'slonik';
import { z } from 'zod';

declare type BuildView<
  TFilter extends Record<string, any> = Record<never, any>,
  TFilterKey extends keyof TFilter = never,
  TAliases extends string = '_main',
  TColumns extends string = never,
> = {
  addFilters<
    TNewFilter extends Record<string, any> = Record<never, any>,
    TNewFilterKey extends keyof TNewFilter = keyof TNewFilter extends Record<infer K, any>
      ? K extends string
        ? K
        : never
      : never,
  >(filters: {
    [x in TNewFilterKey]?: (
      filter: TNewFilter[x],
      allFilters: TFilter & TNewFilter,
      context: any,
    ) => Promise<SqlFragment | null | undefined | false> | SqlFragment | null | undefined | false;
  }): BuildView<TNewFilter & TFilter, keyof TNewFilter | TFilterKey, TAliases, TColumns>;
  addStringFilter: <TKey extends Exclude<string, TFilterKey>>(
    field: TKey | TKey[],
    name?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken;
          } & {
            [x: string]: IdentifierSqlToken;
          },
          value?: z.infer<typeof stringFilterType>,
          allFilters?: TFilter,
          ctx?: any,
        ) => SqlFragment),
  ) => BuildView<
    TFilter & {
      [x in TKey]?: z.infer<typeof stringFilterType>;
    },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >;
  addComparisonFilter: <TKey extends Exclude<string, TFilterKey>>(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken;
          } & {
            [x: string]: IdentifierSqlToken;
          },
          value?: z.infer<typeof comparisonFilterType>,
          allFilters?: TFilter,
          ctx?: any,
        ) => SqlFragment),
    type?: 'text' | 'numeric' | 'integer' | 'bigint' | string,
  ) => BuildView<
    TFilter & {
      [x in TKey]?: z.infer<typeof comparisonFilterType>;
    },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >;
  addJsonContainsFilter: <TKey extends Exclude<string, TFilterKey>>(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken;
          } & {
            [x: string]: IdentifierSqlToken;
          },
          value?: any,
          allFilters?: TFilter,
          ctx?: any,
        ) => SqlFragment),
  ) => BuildView<
    TFilter & {
      [x in TKey]?: Parameters<typeof jsonbContainsFilter>[0];
    },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >;
  addDateFilter: <TKey extends Exclude<string, TFilterKey>>(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken;
          } & {
            [x: string]: IdentifierSqlToken;
          },
          value?: z.infer<typeof dateFilterType>,
          allFilters?: TFilter,
          ctx?: any,
        ) => SqlFragment),
  ) => BuildView<
    TFilter & {
      [x in TKey]?: z.infer<typeof dateFilterType>;
    },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >;
  load: <
    TFragment extends SqlFragment | QuerySqlToken,
    TSelect extends TColumns = never,
    TObject = [TSelect] extends [never]
      ? TFragment extends QuerySqlToken<infer T>
        ? z.infer<T>
        : any
      : Record<TSelect, any>,
  >(
    args: LoadViewParameters<TFilter, TFilterKey, TFragment, TSelect[]>,
  ) => Promise<readonly TObject[]>;
  setColumns: <TNewColumns extends string = never>(
    columns:
      | {
          [x in TNewColumns]: SqlFragment;
        }
      | ArrayLike<TNewColumns>,
  ) => BuildView<TFilter, TFilterKey, TAliases, TColumns | TNewColumns>;
  context: <TContext extends Record<string, any>>(ctx?: TContext) => BuildView<TFilter, TFilterKey, TAliases, TColumns>;
  options: <TOptions extends Record<string, any>>(
    opts?: TOptions,
  ) => BuildView<TFilter, TFilterKey, TAliases, TColumns>;
  setFilterPreprocess: (
    preprocess: (filters: TFilter, context: any) => Promise<TFilter> | TFilter,
  ) => BuildView<TFilter, TFilterKey, TAliases, TColumns>;
  setTableAliases: <TNewAliases extends string>(
    table: Record<TNewAliases, string | IdentifierSqlToken>,
  ) => BuildView<TFilter, TFilterKey, TAliases | TNewAliases, TColumns>;
  addBooleanFilter: <TKey extends Exclude<string, TFilterKey>>(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken;
          } & {
            [x: string]: IdentifierSqlToken;
          },
          value?: boolean,
          allFilters?: TFilter,
          ctx?: any,
        ) => SqlFragment),
    falseFragment?: SqlFragment,
  ) => BuildView<
    TFilter & {
      [x in TKey]?: boolean;
    },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >;
  addInArrayFilter: <
    TKey extends Exclude<string, TFilterKey>,
    TType extends 'text' | 'numeric' | 'integer' | 'bigint' = never,
    TValue = [TType] extends [never] ? string : TType extends 'numeric' | 'integer' | 'bigint' ? number : string,
  >(
    name: TKey | TKey[],
    mapper?:
      | SqlFragment
      | ((
          table: {
            [x in TAliases]: IdentifierSqlToken;
          } & {
            [x: string]: IdentifierSqlToken;
          },
          value?: TValue | TValue[] | null,
          allFilters?: TFilter,
          ctx?: any,
        ) => SqlFragment),
    type?: TType,
  ) => BuildView<
    TFilter & {
      [x in TKey]?: TValue | TValue[] | null;
    },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >;
  addGenericFilter: <TKey extends Exclude<string, TFilterKey>, TNewFilter>(
    name: TKey,
    interpret: (
      filter: TNewFilter,
      allFilters: TFilter & {
        TKey: TNewFilter;
      },
      context: any,
    ) => Promise<SqlFragment | null | undefined | false> | SqlFragment | null | undefined | false,
  ) => BuildView<
    TFilter & {
      [x in TKey]?: TNewFilter;
    },
    keyof TFilter | TKey,
    TAliases,
    TColumns
  >;
  getWhereConditions(args: {
    where?: RecursiveFilterConditions<{
      [x in TFilterKey]?: TFilter[x];
    }>;
    ctx?: any;
    options?: FilterOptions;
  }): Promise<SqlFragment[]>;
  getWhereFragment(args: {
    where?: RecursiveFilterConditions<{
      [x in TFilterKey]?: TFilter[x];
    }>;
    ctx?: any;
    options?: FilterOptions;
  }): Promise<FragmentSqlToken>;
  setConstraints: (
    constraints: (ctx: any) => PromiseOrValue<SqlFragment | SqlFragment[] | null | undefined>,
  ) => BuildView<TFilter, TFilterKey, TAliases>;
  getFromFragment(): FragmentSqlToken;
  getFilters<
    TInclude extends Extract<TFilterKey, string> | `${string}*` = never,
    TExclude extends Extract<TFilterKey, string> | `${string}*` = never,
    TRealInclude extends Extract<TFilterKey, string> = TInclude extends `${infer K}*`
      ? Extract<TFilterKey, `${K}${string}`>
      : Extract<TInclude, Extract<TFilterKey, string>>,
    TRealExclude extends Extract<TFilterKey, string> = TExclude extends `${infer K}*`
      ? Extract<TFilterKey, `${K}${string}`>
      : Extract<TExclude, Extract<TFilterKey, string>>,
    TPrefix extends string = '',
    TRealPrefix extends string = TPrefix extends `${string}.` ? TPrefix : `${TPrefix}.`,
  >(options?: {
    table?: TPrefix;
    include?: readonly TInclude[];
    exclude?: readonly TExclude[];
  }): {
    [x in TFilterKey extends TRealExclude
      ? never
      : [TRealInclude] extends [never]
      ? TFilterKey extends `${TRealPrefix}${string}`
        ? TFilterKey
        : `${TRealPrefix}${Extract<TFilterKey, string>}`
      : TFilterKey extends `${TRealPrefix}${string}`
      ? Extract<TFilterKey, TRealInclude>
      : `${TRealPrefix}${Extract<TFilterKey, TRealInclude>}`]?: (
      filter: TFilter[x extends `${TRealPrefix}${infer K}` ? (K extends TFilterKey ? K : x) : x],
      allFilters: any,
      context: any,
    ) => Promise<SqlFragment | null | undefined | false> | SqlFragment | null | undefined | false;
  };
} & SqlFragment;

export declare const buildView: (
  parts: readonly string[],
  ...values: readonly ValueExpression[]
) => BuildView<Record<never, any>, never, '_main', never>;

declare const comparisonFilterType: z.ZodObject<
  {
    _gt: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    _lt: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    _gte: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    _lte: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    _eq: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    _neq: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    _in: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodEffects<z.ZodUnion<[z.ZodArray<z.ZodNumber, 'many'>, z.ZodNumber]>, number | number[], unknown>,
          z.ZodEffects<z.ZodUnion<[z.ZodArray<z.ZodString, 'many'>, z.ZodString]>, string | string[], unknown>,
        ]
      >
    >;
    _nin: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodEffects<z.ZodUnion<[z.ZodArray<z.ZodNumber, 'many'>, z.ZodNumber]>, number | number[], unknown>,
          z.ZodEffects<z.ZodUnion<[z.ZodArray<z.ZodString, 'many'>, z.ZodString]>, string | string[], unknown>,
        ]
      >
    >;
    _is_null: z.ZodOptional<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    _lt?: string | number | undefined;
    _gt?: string | number | undefined;
    _lte?: string | number | undefined;
    _gte?: string | number | undefined;
    _is_null?: boolean | undefined;
    _eq?: string | number | undefined;
    _neq?: string | number | undefined;
    _in?: string | number | string[] | number[] | undefined;
    _nin?: string | number | string[] | number[] | undefined;
  },
  {
    _lt?: string | number | undefined;
    _gt?: string | number | undefined;
    _lte?: string | number | undefined;
    _gte?: string | number | undefined;
    _is_null?: boolean | undefined;
    _eq?: string | number | undefined;
    _neq?: string | number | undefined;
    _in?: unknown;
    _nin?: unknown;
  }
>;

export declare const createOptions: ReturnFirstArgument<typeof makeQueryLoader>;

declare const dateFilterType: z.ZodObject<
  {
    _lt: z.ZodOptional<z.ZodString>;
    _gt: z.ZodOptional<z.ZodString>;
    _lte: z.ZodOptional<z.ZodString>;
    _gte: z.ZodOptional<z.ZodString>;
    _is_null: z.ZodOptional<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    _lt?: string | undefined;
    _gt?: string | undefined;
    _lte?: string | undefined;
    _gte?: string | undefined;
    _is_null?: boolean | undefined;
  },
  {
    _lt?: string | undefined;
    _gt?: string | undefined;
    _lte?: string | undefined;
    _gte?: string | undefined;
    _is_null?: boolean | undefined;
  }
>;

declare type FilterOptions = {
  orEnabled?: boolean;
  /** If true, auth constraints aren't considered. Only use if you're already adding them in query loaders */
  bypassConstraints?: boolean;
};

declare type FilterOptions_2<TFilter extends Record<string, z.ZodType>, TContext = any> = {
  /** Use this to pre-process any filters to make them consistent */
  preprocess?: (
    filters: RecursiveFilterConditions_2<z.infer<ZodPartial<TFilter>>>,
    context: TContext,
  ) => z.infer<ZodPartial<TFilter>>;
  /** Use this to add any extra conditions, e.g. for forced authorization checks */
  postprocess?: (
    conditions: SqlFragment[],
    filters: RecursiveFilterConditions_2<z.infer<ZodPartial<TFilter>>>,
    context: TContext,
  ) => SqlFragment[];
};

declare type Fragment = FragmentSqlToken;

declare type GetNonEmptyKeys<TFilter extends Record<string, z.ZodTypeAny> = never, TSortable extends string = never> =
  | ([TFilter] extends [never] ? 'take' : [keyof TFilter] extends [never] ? 'take' : 'where')
  | ([TSortable] extends [never] ? 'take' : 'orderBy' | 'searchAfter' | 'takeCursors' | 'cursor' | 'distinctOn')
  | 'take'
  | 'skip'
  | 'select'
  | 'ctx'
  | 'selectGroups';

export declare type InferArgs<
  TLoader extends {
    load: (...args: any) => any;
  },
  TArgs = TLoader extends {
    loadPagination: (...args: readonly [infer A]) => any;
  }
    ? A
    : any,
> = Mutable<Omit<TArgs, 'ctx'>>;

export declare type InferPayload<
  TLoader extends {
    load: (...args: any) => any;
  },
  TArgs extends TLoader extends {
    loadPagination: (...args: readonly [infer A]) => any;
  }
    ? Omit<
        A,
        | 'ctx'
        | 'orderBy'
        | 'searchAfter'
        | 'skip'
        | 'take'
        | 'takeCount'
        | 'takeNextPages'
        | 'where'
        | 'cursor'
        | 'distinctOn'
        | 'takeCursors'
      >
    : never = never,
  TResult extends Record<string, any> = TLoader extends {
    load: (...args: any) => PromiseLike<ArrayLike<infer A>>;
  }
    ? A extends Record<string, any>
      ? Exclude<A, 'cursor'>
      : never
    : any,
  TSelect extends Exclude<keyof TResult, number | symbol> = TArgs extends {
    select: ArrayLike<infer A>;
  }
    ? A extends Exclude<keyof TResult, number | symbol>
      ? A
      : never
    : never,
  TGroups extends {
    [x: string]: ArrayLike<Exclude<keyof TResult, number | symbol>>;
  } = TLoader extends {
    _columnGroups: infer A;
  }
    ? A extends {
        [x: string]: ArrayLike<Exclude<keyof TResult, number | symbol>>;
      }
      ? A
      : never
    : never,
  TGroupSelected extends keyof TGroups = TArgs extends {
    selectGroups: ArrayLike<infer A>;
  }
    ? A extends keyof TGroups
      ? A
      : never
    : never,
> = Pick<
  TResult,
  [TSelect] extends [never]
    ? [TGroupSelected] extends [never]
      ? keyof TResult
      : TGroups[TGroupSelected][number]
    : TSelect | TGroups[TGroupSelected][number]
>;

declare type Interpretors<TFilter extends Record<string, z.ZodType>, TContext = any> = {
  [x in keyof z.infer<z.ZodObject<TFilter>>]?: (
    filter: z.infer<TFilter[x]>,
    allFilters: z.infer<z.ZodObject<TFilter>>, // Does this need ZodRecursive or not?
    context: TContext,
  ) => Promise<SqlFragment | null | undefined | false> | SqlFragment | null | undefined | false;
};

declare const jsonbContainsFilter: (
  filter: Record<string, SerializableValue> | undefined | null,
  field: Fragment,
) => Readonly<{
  type: 'SLONIK_TOKEN_FRAGMENT';
  sql: string;
  values: PrimitiveValueExpression[];
}> | null;

export declare type LoaderOptions = Parameters<typeof makeQueryLoader>[0];

declare type LoadPaginationResult<T> = {
  nodes: readonly T[];
  cursors?: (string | null)[];
  pageInfo: {
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    minimumCount: number;
    startCursor?: string;
    endCursor?: string;
    count: number | null;
  };
};

declare type LoadParameters<
  TFilter,
  TContext,
  TObject extends Record<string, any>,
  TSelect extends keyof TObject,
  TSortable extends string = never,
  TGroupSelectable extends string = never,
  TTakeCursors extends boolean = false,
  TDisabledFilters extends 'AND' | 'OR' | 'NOT' = never,
> = {
  select?: readonly TSelect[];
  take?: number;
  skip?: number;
  searchAfter?: {
    [x in TSortable]?: string | number | boolean | null;
  };
  cursor?: string;
  takeCursors?: TTakeCursors;
  selectGroups?: readonly TGroupSelectable[];
  orderBy?: OptionalArray<readonly [TSortable, 'ASC' | 'DESC' | 'ASC NULLS LAST' | 'DESC NULLS LAST']> | null;
  distinctOn?: OptionalArray<TSortable> | null;
  ctx?: TContext;
  where?: RecursiveFilterConditions_2<TFilter, TDisabledFilters>;
};

declare type LoadViewParameters<
  TFilter extends Record<string, any> = Record<never, any>,
  TFilterKey extends keyof TFilter = never,
  TFragment extends SqlFragment | QuerySqlToken = SqlFragment,
  TColumns extends string[] = never,
> = {
  select: TFragment | TColumns;
  orderBy?: SqlFragment;
  groupBy?: SqlFragment;
  take?: number;
  skip?: number;
  where?: RecursiveFilterConditions<{
    [x in TFilterKey]?: TFilter[x];
  }>;
  db?: Pick<CommonQueryMethods, 'any'>;
};

export declare function makeQueryLoader<
  TContextZod extends z.ZodTypeAny,
  TFragment extends SqlFragment | QuerySqlToken,
  TView extends BuildView,
  TManualFilterTypes extends Record<string, any> = never,
  TFilterTypes extends Record<string, any> = TView extends BuildView<infer T>
    ? [TManualFilterTypes] extends [never]
      ? T
      : T & TManualFilterTypes
    : TManualFilterTypes,
  TObject extends z.AnyZodObject = TFragment extends QuerySqlToken<infer T> ? T : any,
  TVirtuals extends Record<string, any> = z.infer<TObject>,
  TSortable extends string = never,
  TGroups extends {
    [x: string]: readonly [
      Exclude<keyof (z.infer<TObject> & TVirtuals), number | symbol>,
      ...Exclude<keyof (z.infer<TObject> & TVirtuals), number | symbol>[],
    ];
  } = Record<string, never>,
  TSelectable extends Exclude<keyof (z.infer<TObject> & TVirtuals), number | symbol> = Exclude<
    keyof (z.infer<TObject> & TVirtuals),
    number | symbol
  >,
  TContext = z.infer<TContextZod>,
  TFilterOrEnabled extends boolean = false,
  TSortableDefault extends TSortable = TSortable,
>(options: {
  query: {
    select: TFragment;
    from?: SqlFragment;
    view?: TView;
    groupBy?:
      | SqlFragment
      | ((
          args: LoadParameters<
            Partial<TFilterTypes>,
            TContext,
            TVirtuals & z.infer<TObject>,
            keyof (TVirtuals & z.infer<TObject>) & TSelectable,
            TSortable,
            Exclude<keyof TGroups, number | symbol>,
            boolean,
            TFilterOrEnabled extends true ? never : 'OR'
          >,
        ) => SqlFragment);
  };
  plugins?: readonly Plugin_2<any>[];
  type?: TObject;
  contextParser?: TContextZod;
  contextFactory?: (userContext?: z.infer<TContextZod>) => TContext;
  db?: Pick<CommonQueryMethods, 'any'>;
  filters?: {
    filters: TManualFilterTypes;
    interpreters: Interpretors<TManualFilterTypes, TContext>;
    options?: FilterOptions_2<TManualFilterTypes, TContext>;
  };
  constraints?: (ctx: TContext) => PromiseOrValue<SqlFragment | SqlFragment[] | null | undefined>;
  sortableColumns?: {
    [key in TSortable]: SortField;
  };
  columnGroups?: TGroups;
  selectableColumns?: readonly [TSelectable, ...TSelectable[]];
  virtualFields?: {
    [x in keyof TVirtuals]?: {
      load?: (
        rows: readonly z.infer<TObject>[],
        args: LoadParameters<
          TFilterTypes,
          TContext,
          z.infer<TObject>,
          keyof z.infer<TObject> & TSelectable,
          TSortable,
          Exclude<keyof TGroups, number | symbol>,
          boolean,
          TFilterOrEnabled extends true ? never : 'OR'
        >,
      ) => any;
      resolve: (
        row: z.infer<TObject>,
        args: LoadParameters<
          TFilterTypes,
          z.infer<TContextZod>,
          z.infer<TObject>,
          keyof z.infer<TObject> & TSelectable,
          TSortable,
          Exclude<keyof TGroups, number | symbol>,
          boolean,
          TFilterOrEnabled extends true ? never : 'OR'
        > & {
          index: number;
        },
        remoteLoadResult?: any,
      ) => PromiseLike<TVirtuals[x]> | TVirtuals[x];
      dependencies: readonly (keyof z.infer<TObject>)[];
    };
  };
  options?: {
    orFilterEnabled?: TFilterOrEnabled;
    transformColumns?: (column: TSelectable) => string;
    useSqlite?: boolean;
    maxLimit?: number;
    runtimeCheck?: boolean;
    runConcurrency?: number;
  };
  defaults?: {
    orderBy?: OptionalArray<readonly [TSortableDefault, 'ASC' | 'DESC' | 'ASC NULLS LAST' | 'DESC NULLS LAST']> | null;
    take?: number;
  };
}): {
  _columnGroups: TGroups | undefined;
  getSelectableFields: () => [TSelectable, ...TSelectable[]];
  getLoadArgs: <
    TFields extends string = TSelectable,
    TSort extends TSortable = TSortable,
    TFiltersDisabled extends {
      AND?: boolean | undefined;
      OR?: boolean | undefined;
      NOT?: boolean | undefined;
    } = never,
  >({
    sortableColumns,
    selectableColumns,
    disabledFilters,
    transformSortColumns,
  }?: {
    sortableColumns?: [TSort, ...TSort[]] | undefined;
    selectableColumns?: readonly [TFields, ...TFields[]] | undefined;
    disabledFilters?: TFiltersDisabled | undefined;
    transformSortColumns?:
      | ((columns?: [TSort, 'ASC' | 'DESC'][] | null | undefined) => [TSort, 'ASC' | 'DESC'][] | null | undefined)
      | undefined;
  }) => z.ZodObject<
    {
      select: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodEnum<[TFields, ...TFields[]]>, 'many'>>>;
      take: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
      skip: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
      takeCount: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
      takeCursors: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
      cursor: z.ZodOptional<z.ZodOptional<z.ZodString>>;
      takeNextPages: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
      selectGroups: z.ZodOptional<
        z.ZodOptional<
          z.ZodArray<
            z.ZodEnum<[Exclude<keyof TGroups, number | symbol>, ...Exclude<keyof TGroups, number | symbol>[]]>,
            'many'
          >
        >
      >;
      searchAfter: z.ZodOptional<
        z.ZodOptional<
          z.ZodObject<
            { [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]> },
            'strip',
            z.ZodTypeAny,
            {
              [k_2 in keyof z.objectUtil.addQuestionMarks<{
                [k_1 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_1]['_output'];
              }>]: z.objectUtil.addQuestionMarks<{
                [k_1 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_1]['_output'];
              }>[k_2];
            },
            {
              [k_4 in keyof z.objectUtil.addQuestionMarks<{
                [k_3 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_3]['_input'];
              }>]: z.objectUtil.addQuestionMarks<{
                [k_3 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_3]['_input'];
              }>[k_4];
            }
          >
        >
      >;
      orderBy: z.ZodOptional<
        z.ZodNullable<
          z.ZodOptional<
            z.ZodUnion<
              [
                z.ZodArray<z.ZodTuple<[z.ZodEnum<[TSort, ...TSort[]]>, z.ZodEnum<['ASC', 'DESC']>], null>, 'many'>,
                z.ZodTuple<[z.ZodEnum<[TSort, ...TSort[]]>, z.ZodEnum<['ASC', 'DESC']>], null>,
              ]
            >
          >
        >
      >;
      where: z.ZodOptional<
        z.ZodType<
          [TFilterTypes] extends [never]
            ? never
            : [keyof TFilterTypes] extends [never]
            ? never
            : RecursiveFilterConditions_2<
                {
                  [x_1 in keyof TFilterTypes]?:
                    | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
                    | undefined;
                },
                (TFilterOrEnabled extends true ? never : 'OR') | Extract<keyof TFiltersDisabled, 'AND' | 'OR' | 'NOT'>
              >,
          z.ZodTypeDef,
          [TFilterTypes] extends [never]
            ? never
            : [keyof TFilterTypes] extends [never]
            ? never
            : RecursiveFilterConditions_2<
                {
                  [x_1 in keyof TFilterTypes]?:
                    | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
                    | undefined;
                },
                (TFilterOrEnabled extends true ? never : 'OR') | Extract<keyof TFiltersDisabled, 'AND' | 'OR' | 'NOT'>
              >
        >
      >;
    },
    'strip',
    z.ZodTypeAny,
    {
      [k_5 in keyof z.objectUtil.addQuestionMarks<{
        select: TFields[] | undefined;
        take: number | undefined;
        skip: number | undefined;
        takeCount: boolean | undefined;
        takeCursors: boolean | undefined;
        cursor: string | undefined;
        takeNextPages: number | undefined;
        selectGroups: Exclude<keyof TGroups, number | symbol>[] | undefined;
        searchAfter:
          | {
              [k_2 in keyof z.objectUtil.addQuestionMarks<{
                [k_1 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_1]['_output'];
              }>]: z.objectUtil.addQuestionMarks<{
                [k_1 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_1]['_output'];
              }>[k_2];
            }
          | undefined;
        orderBy: [TSort, 'ASC' | 'DESC'] | [TSort, 'ASC' | 'DESC'][] | null | undefined;
        where:
          | ([TFilterTypes] extends [never]
              ? never
              : [keyof TFilterTypes] extends [never]
              ? never
              : RecursiveFilterConditions_2<
                  {
                    [x_1 in keyof TFilterTypes]?:
                      | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
                      | undefined;
                  },
                  (TFilterOrEnabled extends true ? never : 'OR') | Extract<keyof TFiltersDisabled, 'AND' | 'OR' | 'NOT'>
                >)
          | undefined;
      }>]: z.objectUtil.addQuestionMarks<{
        select: TFields[] | undefined;
        take: number | undefined;
        skip: number | undefined;
        takeCount: boolean | undefined;
        takeCursors: boolean | undefined;
        cursor: string | undefined;
        takeNextPages: number | undefined;
        selectGroups: Exclude<keyof TGroups, number | symbol>[] | undefined;
        searchAfter:
          | {
              [k_2 in keyof z.objectUtil.addQuestionMarks<{
                [k_1 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_1]['_output'];
              }>]: z.objectUtil.addQuestionMarks<{
                [k_1 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_1]['_output'];
              }>[k_2];
            }
          | undefined;
        orderBy: [TSort, 'ASC' | 'DESC'] | [TSort, 'ASC' | 'DESC'][] | null | undefined;
        where:
          | ([TFilterTypes] extends [never]
              ? never
              : [keyof TFilterTypes] extends [never]
              ? never
              : RecursiveFilterConditions_2<
                  {
                    [x_1 in keyof TFilterTypes]?:
                      | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
                      | undefined;
                  },
                  (TFilterOrEnabled extends true ? never : 'OR') | Extract<keyof TFiltersDisabled, 'AND' | 'OR' | 'NOT'>
                >)
          | undefined;
      }>[k_5];
    },
    {
      [k_6 in keyof z.objectUtil.addQuestionMarks<{
        select: TFields[] | undefined;
        take: number | undefined;
        skip: number | undefined;
        takeCount: boolean | undefined;
        takeCursors: boolean | undefined;
        cursor: string | undefined;
        takeNextPages: number | undefined;
        selectGroups: Exclude<keyof TGroups, number | symbol>[] | undefined;
        searchAfter:
          | {
              [k_4 in keyof z.objectUtil.addQuestionMarks<{
                [k_3 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_3]['_input'];
              }>]: z.objectUtil.addQuestionMarks<{
                [k_3 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_3]['_input'];
              }>[k_4];
            }
          | undefined;
        orderBy: [TSort, 'ASC' | 'DESC'] | [TSort, 'ASC' | 'DESC'][] | null | undefined;
        where:
          | ([TFilterTypes] extends [never]
              ? never
              : [keyof TFilterTypes] extends [never]
              ? never
              : RecursiveFilterConditions_2<
                  {
                    [x_1 in keyof TFilterTypes]?:
                      | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
                      | undefined;
                  },
                  (TFilterOrEnabled extends true ? never : 'OR') | Extract<keyof TFiltersDisabled, 'AND' | 'OR' | 'NOT'>
                >)
          | undefined;
      }>]: z.objectUtil.addQuestionMarks<{
        select: TFields[] | undefined;
        take: number | undefined;
        skip: number | undefined;
        takeCount: boolean | undefined;
        takeCursors: boolean | undefined;
        cursor: string | undefined;
        takeNextPages: number | undefined;
        selectGroups: Exclude<keyof TGroups, number | symbol>[] | undefined;
        searchAfter:
          | {
              [k_4 in keyof z.objectUtil.addQuestionMarks<{
                [k_3 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_3]['_input'];
              }>]: z.objectUtil.addQuestionMarks<{
                [k_3 in keyof {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }]: {
                  [k in keyof { [x in TSort]: z.ZodTypeAny }]: z.ZodOptional<{ [x in TSort]: z.ZodTypeAny }[k]>;
                }[k_3]['_input'];
              }>[k_4];
            }
          | undefined;
        orderBy: [TSort, 'ASC' | 'DESC'] | [TSort, 'ASC' | 'DESC'][] | null | undefined;
        where:
          | ([TFilterTypes] extends [never]
              ? never
              : [keyof TFilterTypes] extends [never]
              ? never
              : RecursiveFilterConditions_2<
                  {
                    [x_1 in keyof TFilterTypes]?:
                      | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
                      | undefined;
                  },
                  (TFilterOrEnabled extends true ? never : 'OR') | Extract<keyof TFiltersDisabled, 'AND' | 'OR' | 'NOT'>
                >)
          | undefined;
      }>[k_6];
    }
  >;
  getQuery: <
    TSelect extends keyof z.TypeOf<TObject> | keyof TVirtuals = string,
    TGroupSelected extends Exclude<keyof TGroups, number | symbol> = never,
    TTakeCursors extends boolean = false,
  >(
    allArgs: LoadParameters<
      {
        [x_1 in keyof TFilterTypes]?:
          | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
          | undefined;
      },
      z.TypeOf<TContextZod>,
      TVirtuals & z.TypeOf<TObject>,
      TSelect & TSelectable,
      TSortable,
      TGroupSelected,
      TTakeCursors,
      TFilterOrEnabled extends true ? never : 'OR'
    >,
  ) => Promise<
    Readonly<{
      parser: z.ZodType<
        ResultType<TObject, TVirtuals, TGroups[TGroupSelected][number], TSelect>,
        z.ZodTypeDef,
        ResultType<TObject, TVirtuals, TGroups[TGroupSelected][number], TSelect>
      >;
      type: 'SLONIK_TOKEN_QUERY';
      sql: string;
      values: PrimitiveValueExpression[];
    }>
  >;
  load<
    TSelect_1 extends keyof z.TypeOf<TObject> | keyof TVirtuals = never,
    TGroupSelected_1 extends Exclude<keyof TGroups, number | symbol> = never,
  >(
    args: Pick<
      LoadParameters<
        {
          [x_1 in keyof TFilterTypes]?:
            | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
            | undefined;
        },
        z.TypeOf<TContextZod>,
        TVirtuals & z.TypeOf<TObject>,
        TSelect_1 & TSelectable,
        TSortable,
        TGroupSelected_1,
        false,
        TFilterOrEnabled extends true ? never : 'OR'
      >,
      | 'take'
      | 'skip'
      | 'select'
      | 'ctx'
      | 'selectGroups'
      | Exclude<
          [TFilterTypes] extends [never] ? 'take' : [keyof TFilterTypes] extends [never] ? 'take' : 'where',
          'takeCursors'
        >
      | Exclude<
          [TSortable] extends [never] ? 'take' : 'takeCursors' | 'searchAfter' | 'cursor' | 'orderBy' | 'distinctOn',
          'takeCursors'
        >
    >,
    database?: Pick<CommonQueryMethods, 'any'> | undefined,
  ): Promise<readonly ResultType<TObject, TVirtuals, TGroups[TGroupSelected_1][number], TSelect_1>[]>;
  loadPagination<
    TSelect_2 extends keyof z.TypeOf<TObject> | keyof TVirtuals = never,
    TGroupSelected_2 extends Exclude<keyof TGroups, number | symbol> = never,
    TTakeCursors_1 extends boolean = false,
  >(
    args: Pick<
      LoadParameters<
        {
          [x_1 in keyof TFilterTypes]?:
            | (TFilterTypes[x_1] extends z.ZodTypeAny ? z.TypeOf<TFilterTypes[x_1]> : TFilterTypes[x_1])
            | undefined;
        },
        z.TypeOf<TContextZod>,
        TVirtuals & z.TypeOf<TObject>,
        TSelect_2 & TSelectable,
        TSortable,
        TGroupSelected_2,
        TTakeCursors_1,
        TFilterOrEnabled extends true ? never : 'OR'
      >,
      GetNonEmptyKeys<TFilterTypes, TSortable>
    > & {
      takeCount?: boolean | undefined;
      takeNextPages?: number | undefined;
    },
    database?: Pick<CommonQueryMethods, 'any'> | undefined,
  ): Promise<LoadPaginationResult<ResultType<TObject, TVirtuals, TGroups[TGroupSelected_2][number], TSelect_2>>>;
};

declare type Mutable<T> = T & {
  -readonly [P in keyof T]: Mutable<T[P]>;
};

declare type OnGetQueryOptions = {
  args: LoadParameters<any, any, any, any, string, string, boolean>;
  query: QuerySqlToken;
};

declare type OnLoadOptions<TObject extends Record<string, any> = any> = {
  args: LoadParameters<any, any, TObject, any, string, string, boolean>;
  query: QuerySqlToken;
  setResultAndStopExecution: (newResult: PromiseOrValue<TObject[]>) => void;
};

declare type OnLoadPaginationOptions<TObject extends Record<string, any> = any> = {
  args: LoadParameters<any, any, TObject, any, string, string, boolean>;
  query: QuerySqlToken;
  countQuery: QuerySqlToken;
  setCount: (newCount: PromiseOrValue<number>) => void;
  setResultAndStopExecution: (newResult: PromiseOrValue<LoadPaginationResult<TObject>>) => void;
};

declare type OptionalArray<T> = readonly T[] | T;

declare type Plugin_2<TObject extends Record<string, any> = any> = {
  onGetQuery?: (options?: OnGetQueryOptions) => void;
  onLoad?: (options: OnLoadOptions<TObject>) =>
    | {
        onLoadDone?: (options: {
          result: readonly TObject[];
          setResult: (newResult: PromiseOrValue<TObject[]>) => void;
        }) => void;
      }
    | undefined
    | void;
  onLoadPagination?: (options: OnLoadPaginationOptions<TObject>) =>
    | {
        onLoadDone?: (options: {
          result: LoadPaginationResult<TObject>;
          setResult: (newResult: PromiseOrValue<LoadPaginationResult<TObject>>) => void;
        }) => void;
      }
    | undefined
    | void;
};
export { Plugin_2 as Plugin };

declare type PromiseOrValue<T> = T | Promise<T>;

declare type RecursiveFilterConditions<TFilter, TDisabled extends 'AND' | 'OR' | 'NOT' = never> = TFilter &
  Omit<
    {
      AND?: RecursiveFilterConditions<TFilter>[];
      OR?: RecursiveFilterConditions<TFilter>[];
      NOT?: RecursiveFilterConditions<TFilter>;
    },
    TDisabled
  >;

declare type RecursiveFilterConditions_2<TFilter, TDisabled extends 'AND' | 'OR' | 'NOT' = never> = TFilter &
  Omit<
    {
      AND?: RecursiveFilterConditions_2<TFilter>[];
      OR?: RecursiveFilterConditions_2<TFilter>[];
      NOT?: RecursiveFilterConditions_2<TFilter>;
    },
    TDisabled
  >;

declare type ResultType<
  TObject extends z.AnyZodObject,
  TVirtuals extends Record<string, any>,
  TGroupSelected extends keyof (TVirtuals & z.infer<TObject>),
  TSelect extends keyof (TVirtuals & z.infer<TObject>),
> = Pick<
  TVirtuals & Omit<z.infer<TObject>, keyof TVirtuals>, // Virtual fields can overwrite real fields
  [TSelect] extends [never]
    ? [TGroupSelected] extends [never]
      ? keyof (TVirtuals & z.infer<TObject>)
      : TGroupSelected
    : TSelect | TGroupSelected
>;

declare type ReturnFirstArgument<T> = T extends (...args: readonly [infer A]) => any
  ? <G extends A = A>(...args: readonly [G]) => G
  : T;

declare type SortField =
  | string
  | [string, string]
  | [string, string, string]
  | FragmentSqlToken
  | {
      field: FragmentSqlToken;
      nullsLast?: boolean;
      nullable?: boolean;
    };

export { sql };

declare const stringFilterType: z.ZodUnion<
  [
    z.ZodString,
    z.ZodObject<
      {
        _gt: z.ZodOptional<z.ZodString>;
        _lt: z.ZodOptional<z.ZodString>;
        _eq: z.ZodOptional<z.ZodString>;
        _neq: z.ZodOptional<z.ZodString>;
        _in: z.ZodOptional<
          z.ZodEffects<z.ZodUnion<[z.ZodArray<z.ZodString, 'many'>, z.ZodString]>, string | string[], unknown>
        >;
        _nin: z.ZodOptional<
          z.ZodEffects<z.ZodUnion<[z.ZodArray<z.ZodString, 'many'>, z.ZodString]>, string | string[], unknown>
        >;
        _is_null: z.ZodOptional<z.ZodBoolean>;
        _ilike: z.ZodOptional<z.ZodString>;
        _like: z.ZodOptional<z.ZodString>;
        _nlike: z.ZodOptional<z.ZodString>;
        _nilike: z.ZodOptional<z.ZodString>;
        _regex: z.ZodOptional<z.ZodString>;
        _iregex: z.ZodOptional<z.ZodString>;
        _nregex: z.ZodOptional<z.ZodString>;
        _niregex: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        _lt?: string | undefined;
        _gt?: string | undefined;
        _is_null?: boolean | undefined;
        _eq?: string | undefined;
        _neq?: string | undefined;
        _in?: string | string[] | undefined;
        _nin?: string | string[] | undefined;
        _ilike?: string | undefined;
        _like?: string | undefined;
        _nlike?: string | undefined;
        _nilike?: string | undefined;
        _regex?: string | undefined;
        _iregex?: string | undefined;
        _nregex?: string | undefined;
        _niregex?: string | undefined;
      },
      {
        _lt?: string | undefined;
        _gt?: string | undefined;
        _is_null?: boolean | undefined;
        _eq?: string | undefined;
        _neq?: string | undefined;
        _in?: unknown;
        _nin?: unknown;
        _ilike?: string | undefined;
        _like?: string | undefined;
        _nlike?: string | undefined;
        _nilike?: string | undefined;
        _regex?: string | undefined;
        _iregex?: string | undefined;
        _nregex?: string | undefined;
        _niregex?: string | undefined;
      }
    >,
  ]
>;

declare type ZodPartial<TFilter extends Record<string, z.ZodType>> = z.ZodOptional<
  z.ZodObject<{
    [k in keyof TFilter]: z.ZodOptional<TFilter[k]>;
  }>
>;

export {};
