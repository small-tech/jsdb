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

const fs = require('fs')
const path = require('path')

const WhatDB = require('..')

function loadTable (databaseName, tableName) {
  const tablePath = path.join(__dirname, databaseName, `${tableName}.json`)
  return fs.readFileSync(tablePath, 'utf-8')
}

test('database loading', t => {
  const databasePath = path.join(__dirname, 'database')
  const db = new WhatDB(databasePath)

  t.strictEquals(JSON.stringify(db.people), loadTable('database', 'people'), 'People table is as expected')
  t.strictEquals(JSON.stringify(db.settings), loadTable('database', 'settings'), 'Settings table is as expected')

  t.end()

})