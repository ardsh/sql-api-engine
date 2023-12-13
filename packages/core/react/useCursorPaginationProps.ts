import React from "react";
import { useBox } from './utils';
import { noop } from "../shared/utils";

export const initialCursorPagination: CursorPagination = {
    hasNextPage: false,
    currentPage: 1,
    loading: false,
    skip: 0,
    hasPreviousPage: false,
    currentCursor: '',
    startCursor: '',
    endCursor: '',
    reverse: false,
    pageSize: 25,
}

export type CursorPaginationAction = {
    type: 'UPDATE_DATA',
    data: {
        startCursor?: string,
        endCursor?: string,
        hasNextPage?: boolean,
        hasPreviousPage?: boolean,
    }
} | {
    type: 'TABLE_CHANGE',
    pageSize: number,
} | {
    type: 'FIRST_PAGE',
} | {
    type: 'LAST_PAGE',
} | {
    type: 'NEXT_PAGE',
    skipPages?: number,
} | {
    type: 'PREVIOUS_PAGE',
    skipPages?: number,
}

export type CursorPagination = {
    currentCursor?: string,
    skip?: number,
    loading?: boolean,
    currentPage?: number | null,
    startCursor?: string,
    endCursor?: string,
    hasNextPage?: boolean,
    hasPreviousPage?: boolean,
    reverse?: boolean,
    pageSize?: number,
}

export function cursorPaginationReducer(state: CursorPagination = initialCursorPagination, action: CursorPaginationAction): CursorPagination {
    switch (action.type) {
        case 'TABLE_CHANGE':
            return {
                ...state,
                currentCursor: '', // Go to first page
                skip: 0,
                currentPage: 1,
                hasNextPage: true,
                loading: true,
                hasPreviousPage: false,
                reverse: false,
                pageSize: action.pageSize,
            }
        case 'UPDATE_DATA':
            if (!action.data) return state;
            return {
                ...state,
                // If we skipped pages too much, and reached further than the last page, we should revert back to skip:0)
                // If there's no startCursor, it must mean we skipped too much.
                ...(!action.data.startCursor && state.skip && {
                    skip: 0,
                    currentPage: state.currentPage !== null ?
                        Math.max(1, (state.currentPage || 1) - Math.floor(state.skip / (state.pageSize || 25))) : null,
                }),
                loading: false,
                startCursor: action.data.startCursor || '',
                endCursor: action.data.endCursor || '',
                hasNextPage: !!action.data.hasNextPage,
                hasPreviousPage: !!action.data.hasPreviousPage,
            }
        case 'NEXT_PAGE':
            return {
                ...state,
                currentPage: state.currentPage !== null && state.currentCursor !== state.endCursor ?
                    Math.max(1, (state.currentPage || 1) + 1 + (action.skipPages || 0)) : null,
                hasPreviousPage: true,
                hasNextPage: false,
                loading: true,
                skip: (action.skipPages || 0) * (state.pageSize || 25),
                currentCursor: state.endCursor,
                reverse: false,
            }
        case 'PREVIOUS_PAGE':
            return {
                ...state,
                currentPage: state.currentPage !== null && state.currentCursor !== state.startCursor ?
                    Math.max(1, (state.currentPage || 1) - 1 - (action.skipPages || 0)) : null,
                hasNextPage: true,
                hasPreviousPage: false,
                loading: true,
                skip: (action.skipPages || 0) * (state.pageSize || 25),
                currentCursor: state.startCursor,
                reverse: true,
            }
        case 'LAST_PAGE':
            return {
                ...state,
                currentPage: null,
                hasPreviousPage: true,
                hasNextPage: false,
                currentCursor: '',
                loading: true,
                skip: 0,
                reverse: true,
            }
        case 'FIRST_PAGE':
            return {
                ...state,
                currentPage: 1,
                hasNextPage: true,
                hasPreviousPage: false,
                currentCursor: '',
                loading: true,
                skip: 0,
                reverse: false,
            }
        default:
            return state;
    }
}

const getPaginationVariables = ((pagination: CursorPagination = {}) => {
    const { currentCursor = '', reverse = false, pageSize = 25 } = pagination;
    return () => ({
        take: reverse ? -pageSize : pageSize,
        cursor: currentCursor,
    });
});

export const useCursorPaginationActions = (dispatch: React.Dispatch<any>, onPageChange = noop, onPageSizeChange = noop) => {
    const onPageChangeBox = useBox(onPageChange);
    const onPageSizeChangeBox = useBox(onPageSizeChange);
    return React.useMemo(() => ({
        onShowSizeChange: (pageSize?: number) => {
            dispatch({
                type: 'TABLE_CHANGE',
                pageSize
            })
            onPageSizeChangeBox.current(pageSize);
        },
        onCursorChange: (data?: { startCursor?: string, endCursor?: string, hasNextPage?: boolean, hasPreviousPage?: boolean }) => dispatch({
            type: 'UPDATE_DATA',
            startCursor: data?.startCursor,
            endCursor: data?.endCursor,
            hasNextPage: data?.hasNextPage,
            hasPreviousPage: data?.hasPreviousPage,
        }),
        onLastPage: () => {
            dispatch({
                type: 'LAST_PAGE',
            });
            onPageChangeBox.current('LAST_PAGE');
        },
        onFirstPage: () => {
            dispatch({
                type: 'FIRST_PAGE'
            });
            onPageChangeBox.current('FIRST_PAGE');
        },
        onPrevious: (skipPages = 0) => {
            dispatch({
                type: 'PREVIOUS_PAGE',
                skipPages: parseInt(skipPages?.toString()) || 0,
            });
            onPageChangeBox.current('PREVIOUS_PAGE');
        },
        onNext: (skipPages = 0) => {
            dispatch({
                type: 'NEXT_PAGE',
                skipPages: parseInt(skipPages?.toString()) || 0,
            });
            onPageChangeBox.current('NEXT_PAGE');
        },
    }), [dispatch, onPageChangeBox, onPageSizeChangeBox]);
};

export interface CursorPaginationProps {
    onPageChange?: (type: string) => any,
    onPageSizeChange?: (pageSize: number) => any,
    initialPagination?: CursorPagination,
    tableKey?: string
}

export function useCursorPaginationProps(props: CursorPaginationProps) {
    const { initialPagination: initialPage, onPageSizeChange } = props;
    const [pagination, dispatch] = React.useReducer(cursorPaginationReducer, {
        ...initialCursorPagination,
        ...initialPage,
    });

    const actions = useCursorPaginationActions(dispatch, props.onPageChange || noop, onPageSizeChange || noop);

    const getPaginationProps = React.useCallback((overwrite?: (pagination: CursorPagination) => CursorPagination) => ({
        ...pagination,
        ...overwrite?.(pagination),
        ...actions,
    }), [actions, pagination]);

    return React.useMemo(() => ({
        getPaginationProps,
        getPaginationVariables: getPaginationVariables(pagination),
    }), [getPaginationProps, pagination])
}
