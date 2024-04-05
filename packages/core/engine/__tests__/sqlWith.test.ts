import { sqlWith } from '../sqlWith'
import { makeQueryTester } from '../../tests/makeQueryTester'
import { sql } from '..'

const { db } = makeQueryTester('sqlWith')

const newUsers = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'johndoe@email.com',
    date_of_birth: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 365 * 20 * Math.random()
    ).toISOString(),
    created_at: new Date().toISOString()
  }
]

it('Inserts data in tables', async () => {
  const data = await sqlWith(newUsers, 'data').runDB(
    sql.unsafe`INSERT INTO users (id, first_name, last_name, email, date_of_birth, created_at)
            SELECT data.id, data.first_name, data.last_name, data.email, data.date_of_birth::timestamp, data.created_at::timestamp
            FROM data
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = data.id)
            RETURNING users.id, users.first_name, users.last_name`,
    {
      db
    }
  )
  const newUser = {
    id: newUsers[0].id,
    first_name: newUsers[0].first_name,
    last_name: newUsers[0].last_name
  }
  expect(data).toEqual([newUser])

  const newData = await db.any(
    sql.unsafe`SELECT id, first_name, last_name FROM users WHERE id = ${newUser.id}`
  )
  expect(newData).toEqual([newUser])
})

it('Can use multiple data sources with', async () => {
  const extraData = [
    {
      email: 'johndoe@email.com',
      uid: '1',
      value: 'foo',
      number: 5
    }
  ]
  const data = await sqlWith(newUsers, 'users')
    .with('bar', extraData)
    .runDB(
      sql.unsafe`SELECT users.*
            , bar.*
            FROM users
            JOIN bar ON users.email = bar.email`,
      {
        db
      }
    )
  expect(data).toEqual([
    {
      id: newUsers[0].id,
      first_name: newUsers[0].first_name,
      last_name: newUsers[0].last_name,
      email: extraData[0].email,
      uid: extraData[0].uid,
      value: extraData[0].value,
      number: extraData[0].number,
      created_at: newUsers[0].created_at,
      date_of_birth: newUsers[0].date_of_birth
    }
  ])
})

it('Throws error if fragment name already exists', async () => {
  expect(() => {
    sqlWith(newUsers, 'data')
      .with('data', newUsers)
      .runDB(sql.unsafe`SELECT users.* FROM users`, {
        db
      })
  }).toThrowError(/Fragment with name data already exists/)
})

it('Can handle nested objects', async () => {
  const newData = [
    {
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      address: {
        street: '123 Main St',
        city: 'New York'
      }
    }
  ]
  const data = await sqlWith(newData).runDB(
    users => sql.unsafe`
        SELECT ${users.id}, ${users.first_name}, ${users.last_name}, ${users.address}::json
        FROM ${users}
    `,
    { db }
  )
  expect(data).toEqual([
    {
      id: newData[0].id,
      first_name: newData[0].first_name,
      last_name: newData[0].last_name,
      address: newData[0].address
    }
  ])
})

it('Can handle dates', async () => {
  const newData = [
    {
      id: '1',
      active: true,
      first_name: 'John',
      last_name: 'Doe',
      dateOfBirth: new Date(
        Date.now() - 1000 * 60 * 60 * 24 * 365 * 20 * Math.random()
      ) as any
    }
  ]
  const data = await sqlWith(newData, 'users').runDB(
    users => sql.unsafe`
            SELECT ${users.id}, ${users.active}, ${users.first_name}, users.last_name, users."dateOfBirth"
            FROM users
            `,
    { db }
  )
  expect(data).toEqual([
    {
      id: newData[0].id,
      active: newData[0].active,
      first_name: newData[0].first_name,
      last_name: newData[0].last_name,
      dateOfBirth: newData[0].dateOfBirth?.toISOString()
    }
  ])
})
