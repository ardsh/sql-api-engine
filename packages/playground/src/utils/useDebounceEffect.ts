import { useEffect, useRef } from 'react';

export const useDebounceEffect = (callback: any, deps: any[], delay = 1000) => {
  const timeoutRef = useRef<any>();
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  const dependencies = [...deps, delay];
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    const timer = (timeoutRef.current = setTimeout(() => {
      callbackRef.current();
      clearTimeout(timeoutRef.current);
    }, delay));
    return () => clearTimeout(timer);
  }, dependencies);
};
