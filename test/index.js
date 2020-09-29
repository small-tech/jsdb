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
const Time = require('../lib/Time')
const { needsToBeProxified, log } = require('../lib/Util')

const readlineSync = require('@jcbuisson/readlinesync')

function loadTable (databaseName, tableName) {
  const tablePath = path.join(__dirname, databaseName, `${tableName}.js`)

  // Load the table line by line. We don’t use require here as we don’t want it getting cached.
  const lines = readlineSync(tablePath)

  // Handle the header manually.
  eval(lines.next().value) // Create the correct root object of the object graph and assign it to variable _.
  lines.next()             // Skip the require() statement in the header.

  // Load in the rest of the data.
  for (let line of lines) {
    eval(line)
  }

  // Note: _ is dynamically generated via the loaded file.
  return _
}

const databasePath = path.join(__dirname, 'db')

class AClass {}

test('basic persistence', t => {
  // Ensure database does not exist.
  fs.removeSync(databasePath)

  //
  // Database creation.
  //

  const people = [
    {"name":"aral","age":44},
    {"name":"laura","age":34}
  ]

  let db = new WhatDB(databasePath)

  t.ok(fs.existsSync(databasePath), 'database is created')

  //
  // Table creation (synchronous).
  //

  db.people = people

  t.doesNotEqual(db.people, people, 'proxy and object are different')
  t.strictEquals(JSON.stringify(db.people), JSON.stringify(people), 'original object and data in table are same')

  const expectedTablePath = path.join(databasePath, 'people.js')
  t.ok(fs.existsSync(expectedTablePath), 'table is created')

  const createdTable = loadTable('db', 'people')
  t.strictEquals(JSON.stringify(createdTable), JSON.stringify(db.people), 'persisted table matches in-memory table')

  // TODO: test compacting.

  //
  // Property update.
  //

  // Listen for the save event.
  let actualWriteCount = 0
  const tableListener = table => {

    actualWriteCount++

    if (actualWriteCount === 1) {
      t.strictEquals(table.tableName, 'people', 'the correct table is saved')
      t.strictEquals(expectedWriteCount, actualWriteCount, 'write 1: expected number of writes has taken place')

      t.strictEquals(JSON.stringify(db.people), JSON.stringify(people), 'write 1: original object and data in table are same after property update')

      const updatedTable = loadTable('db', 'people')
      t.strictEquals(JSON.stringify(updatedTable), JSON.stringify(db.people), 'write 1: persisted table matches in-memory table after property update')

      //
      // Update two properties within the same stack frame.
      //
      expectedWriteCount = 2

      db.people[0].age = 43
      db.people[1].age = 33
    }

    if (actualWriteCount === 2) {
      t.strictEquals(expectedWriteCount, actualWriteCount, 'write 2: expected number of writes has taken place')
      t.strictEquals(JSON.stringify(db.people), JSON.stringify(people), 'write 2: original object and data in table are same after property update')
      const updatedTable = loadTable('db', 'people')
      t.strictEquals(JSON.stringify(updatedTable), JSON.stringify(db.people), 'write 2: persisted table matches in-memory table after property update')

      db.people.__table__.removeListener('persist', tableListener)

      //
      // Table loading.
      //

      const inMemoryStateOfPeopleTableFromOriginalDatabase = JSON.stringify(db.people)

      db = null

      db = new WhatDB(databasePath)

      t.strictEquals(JSON.stringify(db.people), inMemoryStateOfPeopleTableFromOriginalDatabase, 'loaded data matches previous state of the in-memory table')

      t.end()
    }
  }
  db.people.__table__.addListener('persist', tableListener)

  // Update a property
  let expectedWriteCount = 1
  db.people[0].age = 21
})

test('concurrent updates', t => {
  // Ensure database does not exist.
  fs.removeSync(databasePath)

  const settings = {
    darkMode: 'auto',
    colours: {
      red: '#FF5555',
      green: '#55FF55',
      magenta: '#FF55FF'
    }
  }

  const db = new WhatDB(databasePath)

  db.settings = settings

  const expectedTablePath = path.join(databasePath, 'settings.js')
  t.ok(fs.existsSync(expectedTablePath), 'table is created')

  const createdTable = loadTable('db', 'settings')
  t.strictEquals(JSON.stringify(createdTable), JSON.stringify(db.settings), 'persisted table matches in-memory table')

  let handlerInvocationCount = 0

  // TODO: Pull out handler and removeListener before test end.
  db.settings.__table__.addListener('save', table => {

    handlerInvocationCount++

    if (handlerInvocationCount === 1) {
      //
      // After the first save, we expect darkMode to be 'always-on'
      // and the colours to be the original ones.
      //
      const persistedTable = loadTable('db', 'settings')
      const originalColours = {red: '#FF5555', green: '#55FF55', magenta: '#FF55FF'}

      t.strictEquals(persistedTable.darkMode, 'always-on', 'write 1: updated value is correctly saved')
      t.strictEquals(JSON.stringify(persistedTable.colours), JSON.stringify(originalColours), 'write 1: unchanged values are unchanged as expected')

    } else if (handlerInvocationCount === 2) {
      //
      // After the second save, the state of the persisted table should
      // match the state of the in-memory one.
      //
      const persistedTable = loadTable('db', 'settings')
      t.strictEquals(JSON.stringify(persistedTable), JSON.stringify(settings), 'write 2: persisted table matches in-memory table')

      // Trigger a new change.
      delete db.settings.colours

    } else if (handlerInvocationCount === 3) {
      //
      // After the third save, the colours object should be deleted.
      //
      t.strictEquals(settings.colours, undefined, 'write 3: object confirmed as deleted from in-memory table')
      const persistedTable = loadTable('db', 'settings')
      t.strictEquals(JSON.stringify(persistedTable), JSON.stringify(settings), 'write 3: persisted table matches in-memory table')

      t.end()
    } else {
      t.fail('save handler called too many times')
    }
  })

  // This update should trigger a save.
  db.settings.darkMode = 'always-on'

  setImmediate(() => {
    // This update should also trigger a single save
    // but after the first one is done.
    // Note: this also tests deep proxification of a changed object.
    db.settings.colours = {red: '#AA0000', green: '#00AA00', magenta: '#AA00AA'}
  })
})


test('Time', t => {
  const t1 = Time.mark()
  const t2 = Time.mark()
  const t3 = Time.elapsed(-1)
  const t4 = Time.elapsed(0)
  const t5 = Time.elapsed(1)
  const t6 = Time.elapsed()

  t.ok(t2 > t1, 'time marks are in expected order')

  t.strictEquals(typeof t1, 'number', 'mark method returns number')
  t.strictEquals(typeof t3, 'number', 'negative number as argument to elapsed method returns number')
  t.strictEquals(typeof t4, 'string', 'zero as argument to elapsed method returns string')
  t.strictEquals(typeof t5, 'string', 'positive number as argument to elapsed method returns string')
  t.strictEquals(typeof t6, 'string', 'default behaviour of elapsed method is to return string')
  t.end()
})

test ('Util', t => {
  //
  // needsToBeProxified()
  //
  t.strictEquals(needsToBeProxified(null), false, 'null does not need to be proxified')
  t.strictEquals(needsToBeProxified(undefined), false, 'undefined does not need to be proxified')
  t.strictEquals(needsToBeProxified(true), false, 'booleans do not need to be proxified')
  t.strictEquals(needsToBeProxified(5), false, 'numbers do not need to be proxified')
  t.strictEquals(needsToBeProxified('hello'), false, 'strings don’t need to be proxified')
  t.strictEquals(needsToBeProxified(2n), false, 'bigints do not need to be proxified') // will this throw?
  t.strictEquals(needsToBeProxified(Symbol('hello')), false, 'symbols do not need to be proxified')
  t.strictEquals(needsToBeProxified(function(){}), false, 'functions do not need to be proxified')
  t.strictEquals(needsToBeProxified(new Proxy({}, {})), false, 'proxies don’t need to be proxified')

  t.strictEquals(needsToBeProxified({}), true, 'objects need to be proxified')
  t.strictEquals(needsToBeProxified([]), true, 'arrays need to be proxified')
  t.strictEquals(needsToBeProxified(new AClass()), true, 'custom objects need to be proxified')

  //
  // log()
  //
  const _log = console.log
  let invocationCount = 0
  console.log = function () {
    invocationCount++
  }

  process.env.QUIET = false
  log('this should result in console.log being called')
  t.strictEquals(invocationCount, 1, 'log not invoked when process.env.QUIET is true')

  process.env.QUIET = true
  log('this should not result in console.log being called')
  t.strictEquals(invocationCount, 1, 'log not invoked when process.env.QUIET is true')

  console.log = _log

  t.end()
})

test('WhatDB', t => {
  // Ensure database does not exist.
  fs.removeSync(databasePath)

  const db = new WhatDB(databasePath)

  t.throws(() => { db.invalid = null      }, 'attempting to create null table throws')
  t.throws(() => { db.invalid = undefined }, 'attempting to create undefined table throws')
  t.throws(() => { db.invalid = function(){} }, 'attempting to create table with function throws')
  t.throws(() => { db.invalid = Symbol('hello') }, 'attempting to create table with symbol throws')
  t.throws(() => { db.invalid = 'hello' }, 'attempting to create table with string throws')
  t.throws(() => { db.invalid = 5 }, 'attempting to create table with number throws')
  t.throws(() => { db.invalid = 2n }, 'attempting to create table with bigint throws')

  db.arrayTable = [1,2,3, [4,5,6], {a:1}, [{b:2}]]
  db.objectTable = {a:1, b:2, c: [1,2,3, [4,5,6], {a:1}, [{b:2}]]}

  const expectedArrayTablePath = path.join(databasePath, 'arrayTable.js')
  const expectedObjectTablePath = path.join(databasePath, 'objectTable.js')

  t.ok(fs.existsSync(expectedArrayTablePath), 'table from array persisted as expected')
  t.ok(fs.existsSync(expectedObjectTablePath), 'table from object persisted as expected')

  t.strictEquals(loadTable('db', 'arrayTable'), JSON.stringify(db.arrayTable, null, 2), 'persisted array table matches in-memory data')
  t.strictEquals(loadTable('db', 'objectTable'), JSON.stringify(db.objectTable, null, 2), 'persisted object table matched in-memory data')

  t.end()
})
