import { sql as sqlRaw } from 'slonik'
import { buildView } from '../engine'

export const sql = Object.assign(sqlRaw, {
  buildView
}) as typeof sqlRaw & {
  buildView: typeof buildView
}
