import { sql } from 'slonik'
import { makeQueryTester } from './utils/makeQueryTester'
import { buildView } from '../engine/buildView'

const { db } = makeQueryTester('buildView')

it('Allows building a view from a string', async () => {
  const view = buildView`FROM users`
    .addFilters({
      test: (value: string) => sql.fragment`email = ${value}`,
      name: (value: string) => sql.fragment`first_name = ${value}`
    })
    .addStringFilter('last_name')
    .addBooleanFilter('long_email', () => sql.fragment`LENGTH(email) > 10`)
  const data = await db.any(
    await view.getQuery({
      where: {
        last_name: {
          _ilike: '%e%'
        },
        long_email: true,
        OR: [
          {
            name: 'Haskell'
          },
          {
            name: 'Bob'
          }
        ]
      }
    })
  )
  expect(data).toEqual([expect.anything(), expect.anything()])
})
