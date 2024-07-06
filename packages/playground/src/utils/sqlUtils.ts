import { useSettingsStore } from '@/components/settings/settingsState';
import { format } from 'sql-formatter';

export function parseSqlQueryValues(sql: string, values: any[] | readonly any[]): string {
  const settings = useSettingsStore.getState().settings;
  if (settings.formatQuery) sql = format(sql, { language: 'postgresql' });
  if (settings.showValues) return [sql, `-- Values: [${values.join(', ')}]`].join('\n');
  return sql.replace(/\$(\d+)/g, (match, number) => {
    const value = values[number - 1];
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'number') {
      return value.toString();
    } else if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    } else if (Array.isArray(value)) {
      return `'{${value.join(',')}}'`;
    } else {
      return match;
    }
  });
}
