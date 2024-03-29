import { sql } from 'slonik'
import { makeQueryTester } from '../../tests/makeQueryTester'
import { buildView } from '../index'
import { makeCountLoader } from '../makeCountLoader'

const { db } = makeQueryTester('countLoader')

const userView = buildView`FROM users`
  .addInArrayFilter('users.id', table => sql.fragment`${table.users}.id`)
  .addStringFilter(['users.name', 'users.profession'])
  .addBooleanFilter(
    'isGmail',
    table => sql.fragment`${table.users}.email ILIKE '%gmail.com'`
  )
  .addBooleanFilter(
    'isAdult',
    table =>
      sql.fragment`${table.users}.date_of_birth < NOW() - INTERVAL '18 years'`
  )

it('Selects all coutns if unspecified select', async () => {
  const loader = makeCountLoader({
    view: userView,
    counts: {
      gmail: { isGmail: true },
      nongmail: { isGmail: false }
    },
    db
  })
  const data = await loader.load()
  expect(data).toEqual({
    gmail: expect.any(Number),
    nongmail: expect.any(Number)
  })
})

it('Allows selecting just some counts', async () => {
  const loader = makeCountLoader({
    view: userView,
    counts: {
      all: {},
      gmail: { isGmail: true },
      nongmail: { isGmail: false },
      adults: { isAdult: true }
    },
    db
  })
  const data = await loader.load({ select: ['all', 'adults'] })
  expect(data).toEqual({
    adults: 5,
    all: 9
  })
})

it('Allows setting constraints', async () => {
  const loader = makeCountLoader({
    view: userView,
    constraints(ctx) {
      return sql.fragment`users.id IS NULL`
    },
    counts: {
      all: {},
      // @ts-expect-error adminUsers is not a valid filter
      invalidCount: { adminUsers: true },
      gmail: { isGmail: true },
      nongmail: { isGmail: false },
      adults: { isAdult: true }
    },
    db
  })
  const data = await loader.load({ select: ['all', 'adults'] })
  expect(data).toEqual({
    adults: 0,
    all: 0
  })
})

it('Allows counting only distinct items', async () => {
  const loader = makeCountLoader({
    view: userView,
    counts: {
      distinct_birthdays: { count: sql.fragment`DISTINCT users.date_of_birth` }
    },
    db
  })
  const data = await loader.load({ select: ['distinct_birthdays'] })
  expect(data).toEqual({
    distinct_birthdays: 5
  })
})
