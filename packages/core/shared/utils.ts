export function notEmpty<TValue>(
  value: TValue | null | undefined | void
): value is TValue {
  return value !== null && value !== undefined
}

export const noop = (...args: any[]) => { };

export const lastSegment = (url: string) => {
    if (!!url) {
        return url.substring(url.lastIndexOf('/') + 1)
    }
    return null;
}
