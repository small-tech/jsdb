////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// WhatDB tests.
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

process.env['QUIET'] = true

const test = require('tape')

const fs = require('fs-extra')
const path = require('path')

const WhatDB = require('..')

function loadTable (databaseName, tableName) {
  const tablePath = path.join(__dirname, databaseName, `${tableName}.json`)
  return fs.readFileSync(tablePath, 'utf-8')
}

test('persistence', t => {
  const databasePath = path.join(__dirname, 'db')

  // Ensure database does not exist.
  fs.removeSync(databasePath)

  //
  // Database creation.
  //

  const people = [
    {"name":"aral","age":44},
    {"name":"laura","age":34}
  ]

  const db = new WhatDB(databasePath)

  t.ok(fs.existsSync(databasePath), 'database is created')

  //
  // Table creation.
  //

  db.people = people

  t.doesNotEqual(db.people, people, 'proxy and object are different')
  t.strictEquals(JSON.stringify(db.people), JSON.stringify(people), 'original object and data in table are same')

  const expectedTablePath = path.join(databasePath, 'people.json')
  t.ok(fs.existsSync(expectedTablePath), 'table is created')

  const createdTable = loadTable('db', 'people')
  t.strictEquals(createdTable, JSON.stringify(db.people, null, 2), 'persisted table matches in-memory table')

  //
  // Property update.
  //
  db.people[0].age = 21

  // Since writes are asynchronous, we wait a bit to give the table time to save.
  setTimeout(() => {
    t.strictEquals(JSON.stringify(db.people), JSON.stringify(people), 'original object and data in table are same after property update')

    const updatedTable = loadTable('db', 'people')
    t.strictEquals(updatedTable, JSON.stringify(db.people, null, 2), 'persisted table matches in-memory table after property update')

    t.end()

  }, 100)
  // t.strictEquals(JSON.stringify(db.settings), loadTable('database', 'settings'), 'Settings table is as expected')
})