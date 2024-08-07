import { create } from 'zustand';
import { parseSqlQueryValues } from '@/utils/sqlUtils';

type Status = 'booting' | 'installing' | 'starting' | 'ready';
export type ContainerState = {
  url: string;
  output: string[];
  status: Status;
  installPercent: number;
  queries: {
    sql: string;
    values: any[];
  }[];
};

export const useContainerState = create<ContainerState>(() => ({
  url: '',
  status: 'booting',
  installPercent: 0,
  output: [],
  queries: [],
}));

export function setContainerState<TKey extends keyof ContainerState>(
  key: TKey,
  value: ContainerState[TKey] | ((prevValue: ContainerState[TKey]) => ContainerState[TKey]),
) {
  if (value !== undefined) {
    useContainerState.setState(
      typeof value === 'function' ? prevState => ({ [key]: value(prevState[key]) }) : { [key]: value },
    );
  }
}

export const addContainerOutput = (output: string) =>
  useContainerState.setState(state => ({
    output: [...state?.output, output],
  }));

export const addSqlQuery = (query: { sql: string; values: any[] }, reset?: boolean) =>
  useContainerState.setState(state => ({
    queries: reset && query ? [query] : [...state?.queries, query && { sql: query.sql, values: query.values }],
  }));

export const useSqlQueries = () =>
  useContainerState(state =>
    state.queries.length
      ? state.queries
          .map(
            (query, idx, arr) =>
              (arr.length > 1 ? '-- Query #' + (idx + 1) + '\n' : '') + parseSqlQueryValues(query.sql, query.values),
          )
          .join(';\n\n') + (state.status === 'starting' ? '\nLoading...' : '')
      : state.status === 'starting'
      ? 'Starting...'
      : state.status === 'installing'
      ? `Installing dependencies...${state.installPercent ? ` ${Math.round(state.installPercent)}%` : ''}`
      : state.status === 'booting'
      ? 'Booting up webcontainer...'
      : 'Loading...',
  );

export const useContainerStatus = () => useContainerState(state => state.status);
