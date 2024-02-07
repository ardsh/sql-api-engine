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
  table => sql.fragment`${table.users}.date_of_birth < NOW() - INTERVAL '18 years'`
);


it('Selects all coutns if unspecified select', async () => {
  const loader = makeCountLoader({
    view: userView,
    counts: {
      gmail: { isGmail: true },
      nongmail: { isGmail: false }
    },
    db
  });
  const data = await loader.load();
  expect(data).toEqual({
    gmail: expect.any(Number),
    nongmail: expect.any(Number)
  });
});

it("Allows selecting just some counts", async () => {
  const loader = makeCountLoader({
    view: userView,
    counts: {
      all: {},
      gmail: { isGmail: true },
      nongmail: { isGmail: false },
      adults: { isAdult: true }
    },
    db
  });
  const data = await loader.load({ select: ['all', 'adults'] });
  expect(data).toEqual({
    adults: 5,
    all: 9
  });
});
