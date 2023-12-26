export function notEmpty<TValue>(
  value: TValue | null | undefined | void
): value is TValue {
  return value !== null && value !== undefined
}

export const noop = (...args: any[]) => {}

export const lastSegment = (url: string) => {
  if (!!url) {
    return url.substring(url.lastIndexOf('/') + 1)
  }
  return null
}

export function parseSqlQueryValues(
  sql: string,
  values: any[] | readonly any[]
): string {
  return sql.replace(/\$(\d+)/g, (match, number) => {
    const value = values[number - 1]
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`
    } else if (typeof value === 'number') {
      return value.toString()
    } else if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE'
    } else if (Array.isArray(value)) {
      return `'{${value.join(',')}}'`
    } else {
      return match
    }
  })
}
