import React from 'react';
import { CursorPagination, CursorPaginationAction, CursorPaginationProps, cursorPaginationReducer, initialCursorPagination, useCursorPaginationActions } from './useCursorPaginationProps';
import { useBox } from './utils';
import { noop, lastSegment } from '../shared/utils';

const hasDiffItems = <T extends any>(a: T[], b: any[]) => {
    return a.some(item => !b.includes(item));
}

type Action = {
    type: "SELECT_FIELDS",
    select: string[]
} | {
    type: "TAKE_COUNT",
    takeCount: boolean
} | {
    type: "TOGGLE_ORDER",
    key: string,
} | {
    type: 'TABLE_CHANGE',
    page: number,
    pageSize: number,
} | {
    type: 'PAGE_CHANGE',
    current: number,
} | CursorPaginationAction

export const makeTableCreator = <TColumnDefinitions extends Record<string, any>>(creatorOptions?: {
    useFilterColumns?: (columns: TColumnDefinitions[], ctx: any) => TColumnDefinitions[],
}) => {
    return function tableDataLoader<TPayload>() {
        const reducer = (state: typeof initialState, action: Action) => {
            switch (action.type) {
                case 'SELECT_FIELDS':
                    return {
                        ...state,
                        select: [... new Set(state.select.concat(action.select))].sort(),
                    };
                case 'TAKE_COUNT':
                    return {
                        ...state,
                        takeCount: action.takeCount,
                    }
                case 'PAGE_CHANGE':
                    return {
                        ...state,
                    }
                // Same action type for both pagination reducers...
                case 'TABLE_CHANGE':
                    return {
                        ...state,
                        cursorPagination: cursorPaginationReducer(state.cursorPagination, action),
                    }
                case 'TOGGLE_ORDER':
                    return {
                        ...state,
                        sortingChanged: true,
                        // Doesn't allow more than one order by
                        orderBy: {
                            [action.key]: !(state.orderBy[action.key])
                        }
                    }
                case 'FIRST_PAGE':
                case 'LAST_PAGE':
                case 'NEXT_PAGE':
                case 'PREVIOUS_PAGE':
                case 'UPDATE_DATA':
                    return {
                        ...state,
                        cursorPagination: cursorPaginationReducer(state.cursorPagination, action),
                    }
                default:
                    return state;
            }
        }

        const initialData = {
            nodes: [] as TPayload[],
            pageInfo: {
                count: null,
                minimumCount: 0,
                startCursor: '',
                endCursor: '',
                hasNextPage: false,
            }
        };
        const initialState = {
            takeCount: false,
            orderBy: {} as { [x: string]: boolean },
            tableKey: '' as string,
            sortingChanged: false,
            cursorPagination: initialCursorPagination,
            select: [] as any[],
        };

        const SelectContext = React.createContext([] as Exclude<keyof TPayload, number | symbol>[]);
        const CursorContext = React.createContext(initialCursorPagination);
        const TableKeyContext = React.createContext('');
        const OrderContext = React.createContext({} as { [x: string]: boolean });
        const StateRefContext = React.createContext({ current: initialState } as React.RefObject<typeof initialState>);
        const DataContext = React.createContext({ current: initialData } as React.MutableRefObject<typeof initialData>);
        const DispatchContext = React.createContext((() => {
            return {};
        }) as React.Dispatch<Action>);
        const TakeCountContext = React.createContext(false);
        const SortingChangedContext = React.createContext(false);
        type ContextProps = {
            children: React.ReactNode,
            tableKey?: string,
            /** Specify only one key in the object for sorting (all but one will get ignored) */
            initialSorting?: typeof initialState.orderBy,
        }

        const ContextProvider = ({ children, tableKey, initialSorting }: ContextProps) => {
            const _tableKey = tableKey || lastSegment(window.location.pathname) || '';
            const [state, dispatch] = React.useReducer(reducer, {
                ...initialState,
                orderBy: {
                    ...initialState.orderBy,
                    ...initialSorting,
                },
                tableKey: _tableKey,
            });
            const stateBox = useBox(state);

            const dataRef = React.useRef(initialData);

            return (<DispatchContext.Provider value={dispatch}>
                <TableKeyContext.Provider value={_tableKey}>
                    <OrderContext.Provider value={state.orderBy}>
                        <SortingChangedContext.Provider value={state.sortingChanged}>
                            <StateRefContext.Provider value={stateBox}>
                                <CursorContext.Provider value={state.cursorPagination}>
                                    <TakeCountContext.Provider value={state.takeCount}>
                                        <DataContext.Provider value={dataRef}>
                                            <SelectContext.Provider value={state.select}>
                                                {children}
                                            </SelectContext.Provider>
                                        </DataContext.Provider>
                                    </TakeCountContext.Provider>
                                </CursorContext.Provider>
                            </StateRefContext.Provider>
                        </SortingChangedContext.Provider>
                    </OrderContext.Provider>
                </TableKeyContext.Provider>
            </DispatchContext.Provider>)
        };

        const useUpdateQueryData = (data?: {
            nodes?: readonly TPayload[] | null,
            pageInfo: {
                hasNextPage?: boolean,
                hasPreviousPage?: boolean,
                count?: number | null | void,
                startCursor?: string,
                endCursor?: string,
                minimumCount?: number,
            }
        }) => {
            const dataRef = React.useContext(DataContext);
            const dispatch = React.useContext(DispatchContext);
            if (data) {
                dataRef.current = data as any;
            }

            React.useEffect(() => {
                if (data) {
                    // Update cursors
                    dispatch({
                        type: 'UPDATE_DATA',
                        data: data.pageInfo,
                    });
                }
            }, [data, dispatch]);
        };

        type ExtraColumnFields = {
            select?: ((ctx?: any) => readonly (keyof TPayload)[]) | readonly (keyof TPayload)[],
            render?: (data: any, ...args: any[]) => React.ReactNode,
        };

        return {
            ContextProvider,
            CountPopover: (props: { showTotal: (count?: number) => React.ReactNode, showTotalPopover: (activate: () => any) => React.ReactNode }) => {
                const [displayed, setDisplayed] = React.useState(false);
                const dispatch = React.useContext(DispatchContext);
                const dataRef = React.useContext(DataContext);
                const count = dataRef.current?.pageInfo?.count || dataRef.current?.pageInfo?.minimumCount;
                return (displayed ? props.showTotal(count) : props.showTotalPopover(() => {
                    setDisplayed(true);
                    dispatch({
                        type: "TAKE_COUNT",
                        takeCount: true,
                    });
                })) || null;
            },
            useUpdateQueryData,
            useSortingChanged: () => {
                return React.useContext(SortingChangedContext);
            },
            useCursorPaginationVariables: () => {
                const { pageSize = 25, reverse, currentCursor, skip = 0 } = React.useContext(CursorContext);
                const takeCount = React.useContext(TakeCountContext);
                const select = React.useContext(SelectContext);
                return React.useMemo(() => ({
                    select,
                    take: reverse ? -pageSize : pageSize,
                    takeCursors: true,
                    cursor: currentCursor,
                    skip,
                    takeCount,
                }), [takeCount, pageSize, currentCursor, reverse, select, skip]);
            },
            useSorting: () => {
                const order = React.useContext(OrderContext);
                return React.useMemo(() => order, [order])
            },
            useCursorPaginationProps: (props: Omit<CursorPaginationProps, "initialPagination" | "tableKey">) => {
                const dispatch = React.useContext(DispatchContext);
                const tableKey = React.useContext(TableKeyContext);
                const pagination = React.useContext(CursorContext);

                const actions = useCursorPaginationActions(dispatch, props.onPageChange || noop, props.onPageSizeChange || noop);

                const getPaginationProps = React.useCallback((overwrite?: (pagination: CursorPagination) => CursorPagination) => {
                    return ({
                        ...pagination,
                        ...overwrite?.(pagination),
                        ...actions,
                    })
                }, [actions, pagination]);

                return React.useMemo(() => ({
                    getPaginationProps,
                    onFirstPage: actions.onFirstPage,
                }), [getPaginationProps, actions.onFirstPage]);
            },
            /**
             * Call this function when you want to activate (or deactivate) the count.
            */
            useActivateCount: () => {
                const dispatch = React.useContext(DispatchContext);
                return React.useCallback((takeCount?: boolean) => {
                    dispatch({
                        type: "TAKE_COUNT",
                        takeCount: takeCount !== false,
                    });
                }, [dispatch]);
            },
            /** Wrap your table component with this to automatically add the context provider */
            withDataLoader<TProps extends { children: React.ReactNode }>(WrappedComponent: React.ComponentType<TProps>, options?: Omit<ContextProps, "children">) {
                const ComponentWithContext = (props: TProps) => {
                    return <ContextProvider {...options}>
                        <WrappedComponent {...props} />;
                    </ContextProvider>
                };
                ComponentWithContext.displayName = `withDataLoader(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
                return ComponentWithContext;
            },
            useColumns: <TContext extends any>(columns: (Omit<TColumnDefinitions, "render" | "select"> & ExtraColumnFields)[], ctx?: TContext) => {
                const tableKey = React.useContext(TableKeyContext);
                const finalColumns = creatorOptions?.useFilterColumns?.((columns as any), { ...(ctx as any), tableKey }) as (TColumnDefinitions & {
                    select: ((ctx: TContext) => Extract<keyof TPayload, string>) | Extract<keyof TPayload, string>,
                } & ExtraColumnFields)[] || columns;
                const dispatch = React.useContext(DispatchContext);
                const selected = React.useContext(SelectContext);
                const ctxBox = useBox(ctx);
                React.useEffect(() => {
                    const select = finalColumns.flatMap(column => {
                        const select = typeof column.select === 'function' ? column.select(ctxBox.current as any) : column.select;
                        return (select || [])
                    }).filter(Boolean);
                    if (hasDiffItems(select, selected)) {
                        dispatch({
                            type: 'SELECT_FIELDS',
                            select: select as string[],
                        })
                    }
                }, [finalColumns, selected, dispatch, ctxBox]);
                return finalColumns;
            },
            useSelectFields<TSelect extends Exclude<keyof TPayload, number | symbol>>(select: TSelect[]) {
                const dispatch = React.useContext(DispatchContext);
                const selected = React.useContext(SelectContext);
                React.useEffect(() => {
                    if (hasDiffItems(select, selected)) {
                        dispatch({
                            type: 'SELECT_FIELDS',
                            select: select,
                        });
                    }
                }, [select, selected, dispatch]);
            },
            useAscending: (key?: string) => {
                const state = React.useContext(StateRefContext);
                return React.useCallback((overwrittenKey?: string) => {
                    return state.current?.orderBy[overwrittenKey || key || ''];
                }, [state, key]);
            },
            useToggleSort: (key: string) => {
                const dispatch = React.useContext(DispatchContext);
                return React.useCallback(() => {
                    dispatch({
                        type: "TOGGLE_ORDER",
                        key,
                    });
                }, [dispatch, key]);
            },
            useDataGetter: <TSelect extends Exclude<keyof TPayload, number | symbol>=never>(select?: TSelect[]) => {
                const data = React.useContext(DataContext);
                const selected = React.useContext(SelectContext);
                const dispatch = React.useContext(DispatchContext);
                // Add select to aggregate selected
                React.useEffect(() => {
                    if (select && hasDiffItems(select, selected)) {
                        dispatch({
                            type: 'SELECT_FIELDS',
                            select: select,
                        });
                    }
                }, [select, selected, dispatch]);
                return (): Pick<Required<TPayload>, TSelect>[] => Array.isArray(data.current) ? data.current : data.current?.nodes as never;
            },
            useDataFragment: <TSelect extends Exclude<keyof TPayload, number | symbol>=never>(id: string, select?: TSelect[]): ([TSelect] extends [never] ? TPayload : Pick<Required<TPayload>, TSelect>) | undefined => {
                const data = React.useContext(DataContext);
                const selected = React.useContext(SelectContext);
                React.useEffect(() => {
                    if (select && hasDiffItems(select, selected)) {
                        throw new Error('Missing fields on useDataFragment select!')
                    }
                }, [select, selected]);
                return Array.isArray(data.current) ? data.current?.find(item => item.id === id) : data.current?.nodes?.find((item: any) => item.id === id);
            },
            // createColumn may be impossible to make fully generic, but it's easy enough to replicate outside of the abstraction.
            // useColumns is the really important one, to know which columns to render.
            createColumn: <TSelect extends Exclude<keyof TPayload, symbol | number>=never>(arg: Omit<TColumnDefinitions, "render" | "select"> & {
                select?: ((ctx?: any) => TSelect[]) | TSelect[],
                render?: (data: Required<(Pick<TPayload, TSelect>)>, ...args: any[]) => React.ReactNode,
            }) => {
                return arg;
            }
        }
    }
}
