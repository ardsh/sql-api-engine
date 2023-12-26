import React from 'react'

export function useBox<T>(value: T): React.MutableRefObject<T> {
  const box = React.useRef(value)
  React.useEffect(() => {
    if (value !== null && value !== undefined) {
      box.current = value
    }
  }, [value])
  return box
}
