////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// JSDB tests.
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

const JSDB = require('..')
const JSTable = require('../lib/JSTable')
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


function loadTableSource (databaseName, tableName) {
  const tablePath = path.join(__dirname, databaseName, `${tableName}.js`)
  return fs.readFileSync(tablePath, 'utf-8')
}

function dehydrate (string) {
  return string.replace(/\s/g, '')
}

const databasePath = path.join(__dirname, 'db')

class AClass {}

test('basic persistence', t => {
  //
  // Database creation.
  //

  const people = [
    {"name":"aral","age":44},
    {"name":"laura","age":34}
  ]

  let db = new JSDB(databasePath, { deleteIfExists: true })

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

   //
  // Property update.
  //

  // Listen for the persist event.
  let actualWriteCount = 0
  const tableListener = table => {

    actualWriteCount++

    if (actualWriteCount === 1) {
      t.strictEquals(table.tableName, 'people', 'the correct table is persisted')
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
      // Persisted table format.
      //

      const expectedTableSourceBeforeCompaction = `
        globalThis._ = [];
        (function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.people = globalThis._ } })();
        _[0] = JSON.parse(\`{"name":"aral","age":44}\`);
        _[1] = JSON.parse(\`{"name":"laura","age":34}\`);
        _[0]['age'] = 21;
        _[0]['age'] = 43;
        _[1]['age'] = 33;
      `

      const actualTableSourceBeforeCompaction = loadTableSource('db', 'people')

      t.strictEquals(dehydrate(actualTableSourceBeforeCompaction), dehydrate(expectedTableSourceBeforeCompaction), 'table source is as expected before compaction')

      //
      // Table loading (require).
      //

      const inMemoryStateOfPeopleTableFromOriginalDatabase = JSON.stringify(db.people)

      db = null
      db = new JSDB(databasePath)

      t.strictEquals(JSON.stringify(db.people), inMemoryStateOfPeopleTableFromOriginalDatabase, 'loaded data matches previous state of the in-memory table')

      //
      // Table compaction.
      //

      const expectedTableSourceAfterCompaction = `
        globalThis._ = [];
        (function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.people = globalThis._ } })();
        _[0] = JSON.parse(\`{"name":"aral","age":43}\`);
        _[1] = JSON.parse(\`{"name":"laura","age":33}\`);
      `

      const actualTableSourceAfterCompaction = loadTableSource('db', 'people')

      t.strictEquals(dehydrate(actualTableSourceAfterCompaction), dehydrate(expectedTableSourceAfterCompaction), 'compaction works as expected')

      //
      // Table loading (line-by-line).
      //
      db = null
      const tablePath = path.join(databasePath, 'people.js')
      const peopleTable = new JSTable(tablePath, null, { alwaysUseLineByLineLoads: true })

      t.strictEquals(JSON.stringify(peopleTable), inMemoryStateOfPeopleTableFromOriginalDatabase, 'line-by-line loaded data matches previous state of the in-memory table')

      t.end()
    }
  }
  db.people.__table__.addListener('persist', tableListener)

  // Update a property
  let expectedWriteCount = 1
  db.people[0].age = 21
})

test('concurrent updates', t => {
  const settings = {
    darkMode: 'auto',
    colours: {
      red: '#FF5555',
      green: '#55FF55',
      magenta: '#FF55FF'
    }
  }

  const db = new JSDB(databasePath, { deleteIfExists: true })

  db.settings = settings

  const expectedTablePath = path.join(databasePath, 'settings.js')
  t.ok(fs.existsSync(expectedTablePath), 'table is created')

  const createdTable = loadTable('db', 'settings')
  t.strictEquals(JSON.stringify(createdTable), JSON.stringify(db.settings), 'persisted table matches in-memory table')

  let handlerInvocationCount = 0

  // TODO: Pull out handler and removeListener before test end.
  const persistedChanges = []
  db.settings.__table__.addListener('persist', (table, change) => {

    handlerInvocationCount++

    if (handlerInvocationCount > 3) {
      t.fail('persist handler called too many times')
    }

    const expectedChanges = [
      '_[\'darkMode\'] = `always-on`;\n',
      '_[\'colours\'] = JSON.parse(`{"red":"#AA0000","green":"#00AA00","magenta":"#AA00AA"}`);\n',
      'delete _[\'colours\'];\n'
    ]

    if (!expectedChanges.includes(change)) {
      t.fail(`Unexpected change: ${change.replace('\n', '')}`)
    }

    const tableSource = loadTableSource('db', 'settings')

    t.ok(tableSource.includes(change), `table source includes change #${handlerInvocationCount}`)

    persistedChanges.push(change)

    if (handlerInvocationCount === 2) {
      // Trigger a new change.
      delete db.settings.colours
    }

    if (handlerInvocationCount === 3) {
      t.strictEquals(JSON.stringify(expectedChanges), JSON.stringify(persistedChanges), 'all changes persisted')
      t.end()
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


test('Basic queries', t => {

  const db = new JSDB(databasePath, { deleteIfExists: true })

  const cars = [
    { make: "Subaru", model: "Loyale", year: 1991, colour: "Fuscia" },
    { make: "Chevrolet", model: "Suburban 1500", year: 2004, colour: "Turquoise" },
    { make: "Honda", model: "Element", year: 2004, colour: "Orange" },
    { make: "Subaru", model: "Impreza", year: 2011, colour: "Crimson" },
    { make: "Hyundai", model: "Santa Fe", year: 2009, colour: "Turquoise" },
    { make: "Toyota", model: "Avalon", year: 2005, colour: "Khaki" },
    { make: "Mercedes-Benz", model: "600SEL", year: 1992, colour: "Crimson" },
    { make: "Jaguar", model: "XJ Series", year: 2004, colour: "Red" },
    { make: "Isuzu", model: "Hombre Space", year: 2000, colour: "Yellow" },
    { make: "Lexus", model: "LX", year: 1997, colour: "Indigo" }
  ]

  db.cars = cars

  //
  // Relational operators.
  //

  //
  // is, isEqualTo, and equals
  //

  const carWhereYearIs1991 = db.cars.where('year').is(1991).getFirst()
  const carWhereYearIsEqualTo1991 = db.cars.where('year').isEqualTo(1991).getFirst()
  const carWhereYearEquals1991 = db.cars.where('year').equals(1991).getFirst()

  t.strictEquals(JSON.stringify(carWhereYearIs1991), JSON.stringify(cars[0]), 'is returns the expected result')
  t.strictEquals(JSON.stringify(carWhereYearIs1991), JSON.stringify(carWhereYearIsEqualTo1991), 'is and isEqualTo are aliases')
  t.strictEquals(JSON.stringify(carWhereYearIs1991), JSON.stringify(carWhereYearEquals1991), 'is and equals are aliases')

  //
  // isNot, doesNotEqual
  //

  const carsWhereYearIsNot1991 = db.cars.where('year').isNot(1991).get()
  const carsWhereYearDoesNotEqual1991 = db.cars.where('year').doesNotEqual(1991).get()

  t.strictEquals(JSON.stringify(carsWhereYearIsNot1991), JSON.stringify(carsWhereYearDoesNotEqual1991), 'isNot and doesNotEqual are aliases')
  t.strictEquals(carsWhereYearIsNot1991.length, 9, 'isNot: nine results are returned')
  t.notOk(JSON.stringify(carsWhereYearIsNot1991).includes('1991'), 'isNot: returned results do not include the first one')

  //
  // isGreaterThan
  //

  const carsWhereYearIsGreaterThan2004 = db.cars.where('year').isGreaterThan(2004).get()

  t.strictEquals(carsWhereYearIsGreaterThan2004.length, 3, '(>) three results are returned')
  const carsWhereYearIsGreaterThan2004Stringified = JSON.stringify(carsWhereYearIsGreaterThan2004)

  t.ok(carsWhereYearIsGreaterThan2004Stringified.includes(JSON.stringify(cars[5])), '(>) 2005 Toyota is in results')
  t.ok(carsWhereYearIsGreaterThan2004Stringified.includes(JSON.stringify(cars[4])), '(>) 2009 Hyundai is in results')
  t.ok(carsWhereYearIsGreaterThan2004Stringified.includes(JSON.stringify(cars[3])), '(>) 2011 Subaru is in results')

  //
  // isGreaterThanOrEqualTo
  //

  const carsWhereYearIsGreaterThanOrEqualTo2005 = db.cars.where('year').isGreaterThanOrEqualTo(2005).get()

  t.strictEquals(carsWhereYearIsGreaterThanOrEqualTo2005.length, 3, '(>=) three results are returned')
  const carsWhereYearIsGreaterThanOrEqualTo2005Stringified = JSON.stringify(carsWhereYearIsGreaterThanOrEqualTo2005)

  t.ok(carsWhereYearIsGreaterThanOrEqualTo2005Stringified.includes(JSON.stringify(cars[5])), '(>=) 2005 Toyota is in results')
  t.ok(carsWhereYearIsGreaterThanOrEqualTo2005Stringified.includes(JSON.stringify(cars[4])), '(>=) 2009 Hyundai is in results')
  t.ok(carsWhereYearIsGreaterThanOrEqualTo2005Stringified.includes(JSON.stringify(cars[3])), '(>=) 2011 Subaru is in results')

  //
  // isLessThan
  //

  const carsWhereYearIsLessThan2000 = db.cars.where('year').isLessThan(2000).get()

  t.strictEquals(carsWhereYearIsLessThan2000.length, 3, '(<) three results are returned')
  const carsWhereYearIsLessThan2000Stringified = JSON.stringify(carsWhereYearIsLessThan2000)

  t.ok(carsWhereYearIsLessThan2000Stringified.includes(JSON.stringify(cars[0])), '(<) 1991 Subaru is in results')
  t.ok(carsWhereYearIsLessThan2000Stringified.includes(JSON.stringify(cars[6])), '(<) 1992 Mercedes-Benz is in results')
  t.ok(carsWhereYearIsLessThan2000Stringified.includes(JSON.stringify(cars[9])), '(<) 1997 Lexus is in results')

  //
  // isLessThanOrEqualTo
  //

  const carsWhereYearIsLessThanOrEqualTo1997 = db.cars.where('year').isLessThanOrEqualTo(1997).get()

  t.strictEquals(carsWhereYearIsLessThanOrEqualTo1997.length, 3, '(=<) three results are returned')
  const carsWhereYearIsLessThanOrEqualTo1997Stringified = JSON.stringify(carsWhereYearIsLessThanOrEqualTo1997)

  t.ok(carsWhereYearIsLessThanOrEqualTo1997Stringified.includes(JSON.stringify(cars[0])), '(<=) 1991 Subaru is in results')
  t.ok(carsWhereYearIsLessThanOrEqualTo1997Stringified.includes(JSON.stringify(cars[6])), '(<=) 1992 Mercedes-Benz is in results')
  t.ok(carsWhereYearIsLessThanOrEqualTo1997Stringified.includes(JSON.stringify(cars[9])), '(<=) 1997 Lexus is in results')

  //
  // Functional operators.
  //

  //
  // startsWith and startsWithCaseSensitive
  //

  const carsWhereMakeStartsWithH = db.cars.where('make').startsWith('h').get()
  const carsWhereMakeStartsWithHCaseSensitiveCorrectCase = db.cars.where('make').startsWithCaseSensitive('H').get()
  const carsWhereMakeStartsWithHCaseSensitiveIncorrectCase = db.cars.where('make').startsWithCaseSensitive('h').get()

  t.strictEquals(carsWhereMakeStartsWithH.length, 2, 'startsWith: 2 results returned')
  t.strictEquals(carsWhereMakeStartsWithHCaseSensitiveCorrectCase.length, 2, 'startsWithCaseSensitive (correct case): 2 results returned')
  t.strictEquals(JSON.stringify(carsWhereMakeStartsWithH), JSON.stringify(carsWhereMakeStartsWithHCaseSensitiveCorrectCase), 'startsWith and startsWithCaseSensitive (correct case) results are identical')

  t.ok(JSON.stringify(carsWhereMakeStartsWithH).includes(JSON.stringify(cars[2])), 'startsWith h includes Honda')
  t.ok(JSON.stringify(carsWhereMakeStartsWithH).includes(JSON.stringify(cars[4])), 'startsWith h includes Hyundai')

  t.strictEquals(carsWhereMakeStartsWithHCaseSensitiveIncorrectCase.length, 0, 'startsWithCaseSensitive (incorrect case): no results returned')

  //
  // endsWith and endsWithCaseSensitive
  //

  const carsWhereMakeEndsWithBaru = db.cars.where('make').endsWith('BARU').get()
  const carsWhereMakeEndsWithBaruCaseSensitiveCorrectCase = db.cars.where('make').endsWithCaseSensitive('baru').get()
  const carsWhereMakeEndsWithBaruCaseSensitiveIncorrectCase = db.cars.where('make').endsWithCaseSensitive('Baru').get()

  t.strictEquals(carsWhereMakeEndsWithBaru.length, 2, 'endsWith: 2 results returned')
  t.strictEquals(carsWhereMakeEndsWithBaruCaseSensitiveCorrectCase.length, 2, 'endsWithCaseSensitive (correct case): 2 results returned')
  t.strictEquals(JSON.stringify(carsWhereMakeEndsWithBaru), JSON.stringify(carsWhereMakeEndsWithBaruCaseSensitiveCorrectCase), 'endsWith and endsWithCaseSensitive (correct case) results are identical')

  t.ok(JSON.stringify(carsWhereMakeEndsWithBaru).includes(JSON.stringify(cars[0])), 'endsWith baru includes first Subaru')
  t.ok(JSON.stringify(carsWhereMakeEndsWithBaru).includes(JSON.stringify(cars[3])), 'endsWith baru includes second Subaru')

  t.strictEquals(carsWhereMakeEndsWithBaruCaseSensitiveIncorrectCase.length, 0, 'endsWithCaseSensitive (incorrect case): no results returned')

  t.end()
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

test('JSDB', t => {
  const db = new JSDB(databasePath, { deleteIfExists: true })

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

  t.strictEquals(JSON.stringify(loadTable('db', 'arrayTable')), JSON.stringify(db.arrayTable), 'persisted array table matches in-memory data')
  t.strictEquals(JSON.stringify(loadTable('db', 'objectTable')), JSON.stringify(db.objectTable), 'persisted object table matched in-memory data')

  t.end()
})
