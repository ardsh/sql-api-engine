import { create } from 'zustand';
import { parseSqlQueryValues } from '@/utils/sqlUtils';

type Status = 'booting' | 'starting' | 'ready';
export type ContainerState = {
  url: string;
  output: string[];
  status: Status;
  queries: {
    sql: string;
    values: any[];
  }[];
};

export const useContainerState = create<ContainerState>(() => ({
  url: '',
  status: 'booting',
  output: [],
  queries: [],
}));

export function setContainerState<TKey extends keyof ContainerState>(key: TKey, value: ContainerState[TKey]) {
  if (value !== undefined) {
    useContainerState.setState({ [key]: value });
  }
}

export const addContainerOutput = (output: string) =>
  useContainerState.setState(state => ({
    output: [...state?.output, output],
  }));

export const addSqlQuery = (query: { sql: string; values: any[] }) =>
  useContainerState.setState(state => ({
    queries: [...state?.queries, query && { sql: query.sql, values: query.values }],
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
      ? 'Loading...'
      : 'Booting up webcontainer... (may take a minute)',
  );
