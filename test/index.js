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
  fs.remove(databasePath)

  //
  // Creation
  //

  const people = [
    {"name":"aral","age":44},
    {"name":"laura","age":34}
  ]

  const db = new WhatDB(databasePath)

  t.ok(fs.existsSync(databasePath), 'database is created')

  db.people = people

  t.doesNotEqual(db.people, people, 'the proxy and the object are different')
  t.strictEquals(JSON.stringify(db.people), JSON.stringify(people), 'the original object and the data in the table are the same')

  const expectedTablePath = path.join(databasePath, 'people.json')
  t.ok(fs.existsSync(expectedTablePath), 'table is created')

  const persistedTable = loadTable('db', 'people')
  t.strictEquals(persistedTable, JSON.stringify(db.people, null, 2), 'the persisted table matches the in-memory table')

  // t.strictEquals(JSON.stringify(db.settings), loadTable('database', 'settings'), 'Settings table is as expected')

  t.end()

})