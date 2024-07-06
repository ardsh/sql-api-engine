export function hashString(str: string, seed = 0) {
  let h1 = 0xdeadc0de ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 1500450271);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 696729599);

  return h1 >>> 0;
}
