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

"use strict";

process.env['QUIET'] = true

const test = require('tape')

const fs = require('fs-extra')
const path = require('path')

const JSDB = require('..')
const JSTable = require('../lib/JSTable')
const JSDF = require('../lib/JSDF')
const Time = require('../lib/Time')
const { needsToBeProxified, log } = require('../lib/Util')

const { isProxy } = require('util').types

const readlineSync = require('@jcbuisson/readlinesync')
const { debugPort } = require('process')


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

  let db = JSDB.open(databasePath, { deleteIfExists: true })

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
  const tableListener = async table => {

    actualWriteCount++

    //
    // First time the listener is called:
    //

    if (actualWriteCount === 1) {
      t.strictEquals(table.tableName, 'people', 'the correct table is persisted')
      t.strictEquals(expectedWriteCount, actualWriteCount, 'write 1: expected number of writes has taken place')

      t.strictEquals(JSON.stringify(db.people), JSON.stringify(people), 'write 1: original object and data in table are same after property update')

      const updatedTable = loadTable('db', 'people')
      t.strictEquals(JSON.stringify(updatedTable), JSON.stringify(db.people), 'write 1: persisted table matches in-memory table after property update')

      //
      // Update two properties within the same stack frame.
      //
      expectedWriteCount = 3

      db.people[0].age = 43
      db.people[1].age = 33
    }

    //
    // Second time the listener is called:
    //

    if (actualWriteCount === 3) {
      t.strictEquals(expectedWriteCount, actualWriteCount, 'write 3: expected number of writes has taken place')
      t.strictEquals(JSON.stringify(db.people), JSON.stringify(people), 'write 3: original object and data in table are same after property update')
      const updatedTable = loadTable('db', 'people')
      t.strictEquals(JSON.stringify(updatedTable), JSON.stringify(db.people), 'write 3: persisted table matches in-memory table after property update')

      db.people.removeListener('persist', tableListener)

      //
      // Persisted table format.
      //

      const expectedTableSourceBeforeCompaction = `
        globalThis._ = [ { name: \`aral\`, age: 44 }, { name: \`laura\`, age: 34 } ];
        (function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.people = globalThis._ } })();
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

      await db.close()

      db = JSDB.open(databasePath)

      t.strictEquals(JSON.stringify(db.people), inMemoryStateOfPeopleTableFromOriginalDatabase, 'loaded data matches previous state of the in-memory table')

      //
      // Table compaction.
      //

      const expectedTableSourceAfterCompaction = `
        globalThis._ = [ { name: \`aral\`, age: 43 }, { name: \`laura\`, age: 33 } ];
        (function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.people = globalThis._ } })();
      `

      const actualTableSourceAfterCompaction = loadTableSource('db', 'people')

      t.strictEquals(dehydrate(actualTableSourceAfterCompaction), dehydrate(expectedTableSourceAfterCompaction), 'compaction works as expected')

      //
      // Table loading (line-by-line).
      //
      await db.close()

      const tablePath = path.join(databasePath, 'people.js')
      const peopleTable = new JSTable(tablePath)

      // Add another entry so we can test line-by-line loading for subsequent updates/changes.
      peopleTable.push({name: 'osky', age: 8})

      // Note: __table__ is for internal use only.
      await peopleTable.__table__.close()

      const tableSourceAfterClose = loadTableSource('db', 'people')

      const peopleTableAfterPushInMemory = JSON.stringify(peopleTable)
      const peopleTableLoadedLineByLine = new JSTable(tablePath, null, { alwaysUseLineByLineLoads: true })

      const tableSourceAfterLoad = loadTableSource('db', 'people')

      t.strictEquals(JSON.stringify(peopleTableLoadedLineByLine), peopleTableAfterPushInMemory, 'line-by-line loaded data matches previous state of the in-memory table')

      t.strictEquals(tableSourceAfterLoad, tableSourceAfterClose, 'compaction is disabled for line-by-line load as expected')

      // Note: __table__ is for internal use only.
      await peopleTableLoadedLineByLine.__table__.close()

      t.end()
    }
  }
  db.people.addListener('persist', tableListener)

  // Update a property
  let expectedWriteCount = 1
  db.people[0].age = 21
})


test('table decaching on close', async t => {
  // Create the table initially with an empty array.
  const messagesTablePath = path.join(databasePath, 'messages.js')
  let messagesTable = new JSTable(messagesTablePath, [])

  // Populate it with a couple of messages.
  const message1 = {nickname: 'Aral', text: 'Hello! :)'}
  const message2 = {nickname: 'Laura', text: 'Hey! :)'}
  messagesTable.push(message1)
  messagesTable.push(message2)

  // Note: __table__ is for internal use only.
  await messagesTable.__table__.close()

  // Reopen the messages table. This will load the table in using require(), which is cached.
  messagesTable = new JSTable(messagesTablePath)

  t.strictEquals(JSON.stringify(messagesTable[0]), JSON.stringify(message1), 'first load: the first messages is as expected')
  t.strictEquals(JSON.stringify(messagesTable[1]), JSON.stringify(message2), 'first load: the second messages is as expected')
  t.strictEquals(messagesTable.length, 2, 'first load: the number of messages is as expected')

  // Now, lets add two more messages.
  const message3 = {nickname: 'Laura', text: 'So what’s up?'}
  const message4 = {nickname: 'Aral', text: 'Nothing much, just wanted to say “hi!”'}
  messagesTable.push(message3)
  messagesTable.push(message4)

  // Note: __table__ is for internal use only.
  await messagesTable.__table__.close()

  // Now, let’s reopen the messages table a second time. If decaching is working,
  // a fresh copy with our latest messages will be returned. If it is not working
  // properly, then the last two messages will be lost and the table will be returned
  // from the require cache.
  messagesTable = new JSTable(messagesTablePath)

  t.strictEquals(JSON.stringify(messagesTable[0]), JSON.stringify(message1), 'second load: the first messages is as expected')
  t.strictEquals(JSON.stringify(messagesTable[1]), JSON.stringify(message2), 'second load: the second messages is as expected')
  t.strictEquals(JSON.stringify(messagesTable[2]), JSON.stringify(message3), 'second load: the third messages is as expected')
  t.strictEquals(JSON.stringify(messagesTable[3]), JSON.stringify(message4), 'second load: the fourth messages is as expected')
  t.strictEquals(messagesTable.length, 4, 'second load: the number of messages is as expected')

  // Note: __table__ is for internal use only.
  await messagesTable.__table__.close()

  t.end()
})


test('table replacement', async t => {
  const people = [
    {"name":"aral","age":44},
    {"name":"laura","age":34}
  ]

  let db = JSDB.open(databasePath, { deleteIfExists: true })

  db.people = people

  // Attempting to replace the table without first deleting it should throw.
  t.throws(() => db.people = people, 'attempting to replace table without first deleting it throws')

  // To replace a table, we must first delete the current one and then set the new object.
  await db.people.delete()

  // After delete, the table should not exist
  t.notOk(db.people, 'table is confirmed as deleted')

  // Now it should be safe to recreate the table.
  db.people = people

  const createdTable2 = loadTable('db', 'people')
  t.strictEquals(JSON.stringify(createdTable2), JSON.stringify(db.people), 'replaced table matches in-memory table')

  t.end()
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

  const db = JSDB.open(databasePath, { deleteIfExists: true })

  db.settings = settings

  const expectedTablePath = path.join(databasePath, 'settings.js')
  t.ok(fs.existsSync(expectedTablePath), 'table is created')

  const createdTable = loadTable('db', 'settings')
  t.strictEquals(JSON.stringify(createdTable), JSON.stringify(db.settings), 'persisted table matches in-memory table')

  let handlerInvocationCount = 0

  // TODO: Pull out handler and removeListener before test end.
  const persistedChanges = []
  db.settings.addListener('persist', (table, change) => {

    handlerInvocationCount++

    if (handlerInvocationCount > 3) {
      t.fail('persist handler called too many times')
    }

    const expectedChanges = [
      `_['darkMode'] = \`always-on\`;\n`,
      `_['colours'] = { red: \`#AA0000\`, green: \`#00AA00\`, magenta: \`#AA00AA\` };\n`,
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

  const db = JSDB.open(databasePath, { deleteIfExists: true })

  // Note: I know nothing about cars. This is randomly generated data. And I added the tags myself
  // ===== to test the includes operator on an array property.
  const cars = [
    { make: "Subaru", model: "Loyale", year: 1991, colour: "Fuscia", tags: ['fun', 'sporty'], own: true },
    { make: "Chevrolet", model: "Suburban 1500", year: 2004, colour: "Turquoise", tags: ['regal', 'expensive'], own: false },
    { make: "Honda", model: "Element", year: 2004, colour: "Orange", tags: ['fun', 'affordable'], own: false },
    { make: "Subaru", model: "Impreza", year: 2011, colour: "Crimson", tags: ['sporty', 'expensive'], own: false},
    { make: "Hyundai", model: "Santa Fe", year: 2009, colour: "Turquoise", tags: ['sensible', 'affordable'], own: false },
    { make: "Toyota", model: "Avalon", year: 2005, colour: "Khaki", tags: ['fun', 'affordable'], own: false},
    { make: "Mercedes-Benz", model: "600SEL", year: 1992, colour: "Crimson", tags: ['regal', 'expensive', 'fun'], own: true},
    { make: "Jaguar", model: "XJ Series", year: 2004, colour: "Red", tags: ['fun', 'expensive', 'sporty'], own: true},
    { make: "Isuzu", model: "Hombre Space", year: 2000, colour: "Yellow", tags: ['sporty'], own: false},
    { make: "Lexus", model: "LX", year: 1997, colour: "Indigo", tags: ['regal', 'expensive', 'AMAZING'], own: false }
  ]

  db.cars = cars

  //
  // Relational operators.
  //

  //
  // is, isEqualTo, and equals
  // (also tests getFirst())
  //

  const carWhereYearIs1991 = db.cars.where('year').is(1991).getFirst()
  const carWhereYearIsEqualTo1991 = db.cars.where('year').isEqualTo(1991).getFirst()
  const carWhereYearEquals1991 = db.cars.where('year').equals(1991).getFirst()

  // Test boolean values.
  const carsIOwn = db.cars.where('own').is(true).get() // Note: I don’t actually own these cars ;)

  t.strictEquals(JSON.stringify(carWhereYearIs1991), JSON.stringify(cars[0]), 'is returns the expected result')
  t.strictEquals(JSON.stringify(carWhereYearIs1991), JSON.stringify(carWhereYearIsEqualTo1991), 'is and isEqualTo are aliases')
  t.strictEquals(JSON.stringify(carWhereYearIs1991), JSON.stringify(carWhereYearEquals1991), 'is and equals are aliases')

  const expectedListOfCarsIOwn = JSON.stringify([
    {
      make: 'Subaru',
      model: 'Loyale',
      year: 1991,
      colour: 'Fuscia',
      tags: [ 'fun', 'sporty' ],
      own: true
    },
    {
      make: 'Mercedes-Benz',
      model: '600SEL',
      year: 1992,
      colour: 'Crimson',
      tags: [ 'regal', 'expensive', 'fun' ],
      own: true
    },
    {
      make: 'Jaguar',
      model: 'XJ Series',
      year: 2004,
      colour: 'Red',
      tags: [ 'fun', 'expensive', 'sporty' ],
      own: true
    }
  ])

  t.strictEquals(JSON.stringify(carsIOwn), expectedListOfCarsIOwn, 'boolean values in queries are handled properly')

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
  // startsWith and startsWith
  //

  const carsWhereMakeStartsWithCaseInsensitiveH = db.cars.where('make').startsWithCaseInsensitive('h').get()
  const carsWhereMakeStartsWithHCorrectCase = db.cars.where('make').startsWith('H').get()
  const carsWhereMakeStartsWithHIncorrectCase = db.cars.where('make').startsWith('h').get()

  t.strictEquals(carsWhereMakeStartsWithCaseInsensitiveH.length, 2, 'startsWith: 2 results returned')
  t.strictEquals(carsWhereMakeStartsWithHCorrectCase.length, 2, 'startsWith (correct case): 2 results returned')
  t.strictEquals(JSON.stringify(carsWhereMakeStartsWithCaseInsensitiveH), JSON.stringify(carsWhereMakeStartsWithHCorrectCase), 'startsWith and startsWith (correct case) results are identical')

  t.ok(JSON.stringify(carsWhereMakeStartsWithCaseInsensitiveH).includes(JSON.stringify(cars[2])), 'startsWith h includes Honda')
  t.ok(JSON.stringify(carsWhereMakeStartsWithCaseInsensitiveH).includes(JSON.stringify(cars[4])), 'startsWith h includes Hyundai')

  t.strictEquals(carsWhereMakeStartsWithHIncorrectCase.length, 0, 'startsWith (incorrect case): no results returned')

  //
  // endsWith and endsWith
  //

  const carsWhereMakeEndsWithBaruCaseInsensitive = db.cars.where('make').endsWithCaseInsensitive('BARU').get()
  const carsWhereMakeEndsWithBaruCorrectCase = db.cars.where('make').endsWith('baru').get()
  const carsWhereMakeEndsWithBaruIncorrectCase = db.cars.where('make').endsWith('Baru').get()

  t.strictEquals(carsWhereMakeEndsWithBaruCaseInsensitive.length, 2, 'endsWith: 2 results returned')
  t.strictEquals(carsWhereMakeEndsWithBaruCorrectCase.length, 2, 'endsWith (correct case): 2 results returned')
  t.strictEquals(JSON.stringify(carsWhereMakeEndsWithBaruCaseInsensitive), JSON.stringify(carsWhereMakeEndsWithBaruCorrectCase), 'endsWith and endsWith (correct case) results are identical')

  t.ok(JSON.stringify(carsWhereMakeEndsWithBaruCaseInsensitive).includes(JSON.stringify(cars[0])), 'endsWith baru includes first Subaru')
  t.ok(JSON.stringify(carsWhereMakeEndsWithBaruCaseInsensitive).includes(JSON.stringify(cars[3])), 'endsWith baru includes second Subaru')

  t.strictEquals(carsWhereMakeEndsWithBaruIncorrectCase.length, 0, 'endsWith (incorrect case): no results returned')

  //
  // includes and includes (string and object)
  //

  // String
  const carsWhereMakeIncludesSuCaseInsensitive = db.cars.where('make').includesCaseInsensitive('SU').get()
  const carsWhereMakeIncludesSuCorrectCase = db.cars.where('make').includes('su').get()
  const carsWhereMakeIncludesSuIncorrectCase = db.cars.where('make').includes('SU').get()

  t.strictEquals(carsWhereMakeIncludesSuCaseInsensitive.length, 3, 'includes: 2 results returned')
  t.strictEquals(carsWhereMakeIncludesSuCorrectCase.length, 1, 'includes (correct case): 1 result returned')
  t.strictEquals(carsWhereMakeIncludesSuIncorrectCase.length, 0, 'includes (incorrect case): no results returned')

  t.ok(JSON.stringify(carsWhereMakeIncludesSuCaseInsensitive).includes(JSON.stringify(cars[0])), 'includes su (case insensitive): includes first Subaru')
  t.ok(JSON.stringify(carsWhereMakeIncludesSuCaseInsensitive).includes(JSON.stringify(cars[3])), 'includes su (case insensitive): includes second Subaru')
  t.ok(JSON.stringify(carsWhereMakeIncludesSuCaseInsensitive).includes(JSON.stringify(cars[8])), 'includes su (case insensitive): includes Isuzu')

  t.ok(JSON.stringify(carsWhereMakeIncludesSuCorrectCase).includes(JSON.stringify(cars[8])), 'includes su (correct case): includes Isuzu')

  // Object
  // (Note: attempting to use includesCaseInsensitive on an object will throw.)
  const carsThatAreRegal = db.cars.where('tags').includes('regal').get()
  const carsThatAreRegalIncorrectCase = db.cars.where('tags').includes('REGAL').get()

  t.strictEquals(carsThatAreRegal.length, 3, 'includes (object) tagged with "regal" returns 3 cars')

  t.ok(JSON.stringify(carsThatAreRegal).includes(JSON.stringify(cars[1])), 'includes (object): tagged with "regal" includes Chevrolet')
  t.ok(JSON.stringify(carsThatAreRegal).includes(JSON.stringify(cars[6])), 'includes (object): tagged with "regal" includes Mercedes-Benz')
  t.ok(JSON.stringify(carsThatAreRegal).includes(JSON.stringify(cars[9])), 'includes (object): tagged with "regal" includes Lexus')

  t.strictEquals(carsThatAreRegalIncorrectCase.length, 0, 'includes (object): includes is always case sensitive with objects')

  //
  // getLast()
  //

  const lastCrimsonCar = db.cars.where('colour').is('Crimson').getLast()

  t.strictEquals(JSON.stringify(lastCrimsonCar), JSON.stringify(cars[6]), 'getLast(): last crimson car is the Mercedes-Benz')

  //
  // Connectives.
  //

  // and

  const sportyCrimsonCars = db.cars.where('colour').is('Crimson').and('tags').includes('sporty').get()

  t.strictEquals(sportyCrimsonCars.length, 1, 'connective (and): there is only one sporty crimson car')
  t.strictEquals(JSON.stringify(sportyCrimsonCars[0]), JSON.stringify(cars[3]), 'connective (and): the sporty crimson car is the Impreza')

  // or

  const carsThatAreEitherTurquoiseOrOlderThan1992 = db.cars.where('colour').is('Turquoise').or('year').isLessThan(1992).get()

  t.strictEquals(carsThatAreEitherTurquoiseOrOlderThan1992.length, 3, 'connective (or): there are three cars that are either turquoise or older than 1992')
  t.strictEquals(JSON.stringify(carsThatAreEitherTurquoiseOrOlderThan1992[0]), JSON.stringify(cars[0]), 'connective (or): first result is Subaru Loyale')
  t.strictEquals(JSON.stringify(carsThatAreEitherTurquoiseOrOlderThan1992[1]), JSON.stringify(cars[1]), 'connective (or): second result is Chevrolet Suburban 1500')
  t.strictEquals(JSON.stringify(carsThatAreEitherTurquoiseOrOlderThan1992[2]), JSON.stringify(cars[4]), 'connective (or): third result is Hyundai Santa Fe')

  //
  // Complex custom query.
  //

  // Cars that are either fun and affordable or regal and expensive.
  const complexCustomQueryResult = db.cars.whereIsTrue(`(valueOf.tags.includes('fun') && valueOf.tags.includes('affordable')) || (valueOf.tags.includes('regal') && valueOf.tags.includes('expensive'))`).get()

  t.strictEquals(complexCustomQueryResult.length, 5, 'complex custom query: returns 5 results')

  const expectedResult =  [
    { make: 'Chevrolet', model: 'Suburban 1500', year: 2004, colour: 'Turquoise', tags: [ 'regal', 'expensive' ], own: false },
    { make: 'Honda', model: 'Element', year: 2004, colour: 'Orange', tags: [ 'fun', 'affordable' ], own: false},
    { make: 'Toyota', model: 'Avalon', year: 2005, colour: 'Khaki', tags: [ 'fun', 'affordable' ], own: false},
    { make: 'Mercedes-Benz', model: '600SEL', year: 1992, colour: 'Crimson', tags: [ 'regal', 'expensive', 'fun' ], own: true },
    { make: 'Lexus', model: 'LX', year: 1997, colour: 'Indigo', tags: [ 'regal', 'expensive', 'AMAZING' ], own: false}
  ]

  t.strictEquals(JSON.stringify(complexCustomQueryResult), JSON.stringify(expectedResult), 'complex custom query result is as expected')

  //
  // Empty table, non-existent properties in queries, etc.
  //

  db.empty = []

  const shouldBeEmpty = db.empty.where('non-existent').is(5).get()
  const shouldBeUndefined = db.empty.where('non-existent').isGreaterThan(10).and('other').includes('horsey').getFirst()
  const shouldBeUndefined2 = db.empty.where('non-existent').isGreaterThan(10).and('other').includes('horsey').getLast()

  t.strictEquals(JSON.stringify(shouldBeEmpty), JSON.stringify([]), 'query.get() on empty table with non-existent property check returns empty array')
  t.strictEquals(shouldBeUndefined, undefined, 'query.getFirst() on empty table with non-existent property check returns undefined')
  t.strictEquals(shouldBeUndefined2, undefined, 'query.getLast() on empty table with non-existent property check returns undefined')

  // Accessing a non-existent operator on an IncompleteQueryProxy should throw.
  t.throws(() => {
    db.cars.where('colour').isAPleasantShadeOf('Maroon')
  }, 'attempting to access invalid operator on an IncompleteProxyQuery throws')

  // Access to an IncompleteQueryProxy’s own properties should work as expected.
  const incompleteQueryProxy = db.cars.where('year')
  const expectedToBeCarsTable = incompleteQueryProxy.table
  const expectedToBeTheQuery = incompleteQueryProxy.query
  const expectedToBeTheData = incompleteQueryProxy.data

  // Note: __table__ is for internal use only.
  t.strictEquals(expectedToBeCarsTable, db.cars.__table__, 'incompleteQueryProxy.table is as expected')
  t.strictEquals(expectedToBeTheQuery, 'valueOf.year', 'incompleteQueryProxy.query is as expected')
  t.strictEquals(JSON.stringify(expectedToBeTheData), JSON.stringify(db.cars), 'incompleteQueryProxy.data is as expected')

  // Setting, getting, and deleting values from a completed QueryProxy should work as expected.

  // Note the lack of the get() call at the end.
  const completedQuery = db.cars.where('year').is(1991)

  t.strictEquals(completedQuery[0], db.cars[0], 'property access on completed query works as expected')

  const newCar = { make: 'Toyota', model: 'Avalon', year: 2020, colour: 'Red', tags: [ 'fun', 'affordable' ] }
  completedQuery.push(newCar)

  const expectedResultsetAfterPush = [
    db.cars[0],
    newCar
  ]

  t.strictEquals(JSON.stringify(completedQuery.get()), JSON.stringify(expectedResultsetAfterPush), 'adding to the resultset array works as expected')

  delete completedQuery[0]

  const expectedResultsetAfterDelete = [
    undefined,
    newCar
  ]

  t.strictEquals(JSON.stringify(completedQuery.get()), JSON.stringify(expectedResultsetAfterDelete), 'deleting a value from the resultset array works as expected')

  completedQuery[0] = db.cars[0]

  // This should have restored the array to its previous state, after the push.
  t.strictEquals(JSON.stringify(completedQuery.get()), JSON.stringify(expectedResultsetAfterPush), 'defining a property on the resultset array works as expected')

  //
  // Query security.
  // See: https://source.small-tech.org/site.js/lib/jsdb/-/issues/10
  //

  // Temporarily create a global reference to the current test so that the
  // attack payloads can use it to fail the tests should they succeed.
  globalThis.t = t

  const queryInjectionAttackAttemptResult1 = db.cars.where('make === "something"; globalThis.t.fail("Query injection payload 1 delivered"); valueOf.make').is('something'
).get()

  const queryInjectionAttackAttemptResult2 = db.cars.where('make').is('\'+globalThis.t.fail("Query injection payload 2 delivered")+\'').get()

  const queryInjectionAttackAttemptResult3 = db.cars.whereIsTrue('globalThis.t.fail("Query injection payload 3 delivered")').get()

  const queryInjectionAttackAttemptResult4 = db.cars.whereIsTrue('valueOf.make === "something"; globalThis.t.fail("Query injection payload 4 delivered"); valueOf.make === \'something\'').get()

  const queryInjectionAttackAttemptResult5 = db.cars.whereIsTrue('valueOf.make === `2`; globalThis.t.fail("Query injection payload 5 delivered"); valueOf.make === \'something\'').get()

  // Remove the global reference to the test instance as it’s no longer necessary.
  globalThis.t = null

  t.ok(Array.isArray(queryInjectionAttackAttemptResult1) && queryInjectionAttackAttemptResult1.length === 0, '🔒 result of query injection attack attempt 1 is empty array as expected')
  t.ok(Array.isArray(queryInjectionAttackAttemptResult2) && queryInjectionAttackAttemptResult2.length === 0, '🔒 result of query injection attack attempt 2 is empty array as expected')
  t.ok(Array.isArray(queryInjectionAttackAttemptResult3) && queryInjectionAttackAttemptResult3.length === 0, '🔒 result of query injection attack attempt 3 is empty array as expected')
  t.ok(Array.isArray(queryInjectionAttackAttemptResult4) && queryInjectionAttackAttemptResult4.length === 0, '🔒 result of query injection attack attempt 4 is empty array as expected')
  t.ok(Array.isArray(queryInjectionAttackAttemptResult5) && queryInjectionAttackAttemptResult5.length === 0, '🔒 result of query injection attack attempt 5 is empty array as expected')

  t.end()
})


test('Time', t => {

  const labelTime1 = Time.mark('label1')
  const labelTime2 = Time.elapsed('label1', -1)

  const globalTime1 = Time.mark()
  const globalTime2 = Time.mark()
  const globalTime3 = Time.elapsed('global', -1)
  const globalTime4 = Time.elapsed('global', 0)
  const globalTime5 = Time.elapsed('global', 1)
  const globalTime6 = Time.elapsed()

  const globalTime7 = Time.elapsed('global', -1)

  const labelTime3 = Time.elapsed('label1', -1)

  t.ok(globalTime2 > globalTime1, 'global time marks are in expected order')

  t.strictEquals(typeof globalTime1, 'number', 'mark method returns number')
  t.strictEquals(typeof globalTime3, 'number', 'negative number as argument to elapsed method returns number')
  t.strictEquals(typeof globalTime4, 'string', 'zero as argument to elapsed method returns string')
  t.strictEquals(typeof globalTime5, 'string', 'positive number as argument to elapsed method returns string')
  t.strictEquals(typeof globalTime6, 'string', 'default behaviour of elapsed method is to return string')

  t.ok(labelTime2 < labelTime3, 'label1 durations are in expected order')
  t.ok(labelTime3 > globalTime7, 'global and label1 durations are in expected order')

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
  const db = JSDB.open(databasePath, { deleteIfExists: true })

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

  // Attempting to instantiate the JSDB class directly throws.
  t.throws(() => { new JSDB('someBasePath') }, 'Attempting to instantiate the JSDB class directly throws.')

  t.end()
})


function testSerialisation (t, name, value) {
  let serialisedValue
  let deserialisedValue
  t.doesNotThrow(() => serialisedValue = JSDF.serialise(value, 'deserialisedValue'), `${name}: serialisation does not throw`)
  t.doesNotThrow(() => eval(serialisedValue), `${name}: serialised value does not throw on deserialisation`)
  t.strictEquals(JSON.stringify(deserialisedValue), JSON.stringify(value), `${name}: deserialised value matches original value`)
}


test('JSDF', t => {

  // undefined key.
  t.throws(() => JSDF.serialise('something', undefined), 'undefined key throws as expected')

  // null key.
  t.throws(() => JSDF.serialise('something', null), 'null key throws as expected')

  testSerialisation(t, 'undefined', undefined)
  testSerialisation(t, 'null', null)

  //
  // Number.
  //

  testSerialisation(t, 'negative number', -1)
  testSerialisation(t, 'zero', 0)
  testSerialisation(t, 'positive number', 1)
  testSerialisation(t, 'floating-point number', Math.PI)
  testSerialisation(t, 'NaN', NaN)
  testSerialisation(t, 'Infinity', Infinity)
  testSerialisation(t, '-Infinity', -Infinity)

  //
  // Boolean.
  //

  testSerialisation(t, 'Boolean (true)', true)
  testSerialisation(t, 'Boolean (false)', false)

  //
  // String.
  //

  testSerialisation(t, 'String', 'Hello')
  testSerialisation(t, 'String with single quotes', "'Hello'")
  testSerialisation(t, 'String with double quotes', '"Hello"')
  testSerialisation(t, 'String with backticks', "`Hello`")
  testSerialisation(t, 'String with newlines', `Hello\nthere!`)
  testSerialisation(t, 'String with emoji', '😎👍')

  // Security

  testSerialisation(t, '🔒 String injection attempt 1 fails as expected', "${t.fail('Payload 1 delivered')}")
  testSerialisation(t, '🔒 String injection attempt 2 fails as expected', "\\${t.fail('Payload 2 delivered')}")
  testSerialisation(t, '🔒 String injection attempt 3 fails as expected', "` + t.fail('Payload 3 delivered') + `")

  //
  // Plain objects.
  //

  testSerialisation(t, 'Empty object', {})
  testSerialisation(t, 'Object with properties', {x: 1, y: 2, z: 3})
  testSerialisation(t, 'Deep object', {x: {y: {z: 'deep'}}})

  //
  // Arrays.
  //

  testSerialisation(t, 'Empty array', [])
  testSerialisation(t, 'Array with items', [1,2,3])
  testSerialisation(t, 'Deep array', ['easy as', [1,2,3], [[[['a'], 'b'], 'c']]])

  //
  // Date.
  //

  testSerialisation(t, 'Date', new Date())

  //
  // Symbol.
  //

  testSerialisation(t, 'Symbol', Symbol.for('hello'))

  // Custom object.

  class CustomObject {
    x = 1
    y = 2
    sum() {
      return this.x + this.y
    }
  }

  const customObject = new CustomObject()

  // Tests custom object being deserialised in an environment where the custom
  // class does NOT exist (which should result in a regular object being created).
  testSerialisation(t, 'Custom object', customObject)

  // Tests custom object being deserialised in an environment where the custom
  // class does exist.
  let deserialisedCustomObject
  const serialisedCustomObject = JSDF.serialise(customObject, 'deserialisedCustomObject')
  eval(serialisedCustomObject)

  t.strictEquals(deserialisedCustomObject.sum(), 3, 'custom object is deserialised as instance of correct class when class exists')

  //
  // Mixed objects.
  //
  testSerialisation(t, 'Object with array', {x: {y: {z: [1,2,3]}}})
  testSerialisation(t, 'Array with object', [{x: 1, y: 2, z: 3}])
  testSerialisation(t, 'Mixed types', [undefined, null,  1, 0, -1, Math.PI, NaN, Infinity, -Infinity, true, false, 'Hello', "'Hello'", '"Hello"', '`Hello`', `Hello\nthere!`], '😎👍', {}, {x: 1, y: 2, z: 3}, {x: {y: {z: 'deep'}}}, [], [1,2,3],  ['easy as', [1,2,3], [[[['a'], 'b'], 'c']]], new Date(), customObject, {x: {y: {z: [1,2,3]}}}, [{x: 1, y: 2, z: 3}])

  //
  // Unsupported objects.
  //

  //
  // Might be supported in the future.
  //

  t.throws(() => JSDF.serialise(new Map(), '_'), 'Unsupported datatype (Map) throws')
  t.throws(() => JSDF.serialise(new Set(), '_'), 'Unsupported datatype (Set) throws')

  t.throws(() => JSDF.serialise(new WeakMap(), '_'), 'Unsupported datatype (WeakMap) throws')
  t.throws(() => JSDF.serialise(new WeakSet(), '_'), 'Unsupported datatype (WeakSet) throws')

  // Note TypedArray is not included as it is never directly exposed
  // (See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)
  t.throws(() => JSDF.serialise(new ArrayBuffer(), '_'), 'Unsupported datatype (ArrayBuffer) throws')
  t.throws(() => JSDF.serialise(new Float32Array(), '_'), 'Unsupported datatype (Float32Array) throws')
  t.throws(() => JSDF.serialise(new Float64Array(), '_'), 'Unsupported datatype (Float64Array) throws')
  t.throws(() => JSDF.serialise(new Int8Array(), '_'), 'Unsupported datatype (Int8Array) throws')
  t.throws(() => JSDF.serialise(new Int16Array(), '_'), 'Unsupported datatype (Int16Array) throws')
  t.throws(() => JSDF.serialise(new Int32Array(), '_'), 'Unsupported datatype (Int32Array) throws')
  t.throws(() => JSDF.serialise(new Uint8Array(), '_'), 'Unsupported datatype (Uint8Array) throws')
  t.throws(() => JSDF.serialise(new Uint16Array(), '_'), 'Unsupported datatype (Uint16Array) throws')
  t.throws(() => JSDF.serialise(new Uint32Array(), '_'), 'Unsupported datatype (Uint32Array) throws')
  t.throws(() => JSDF.serialise(new Uint8ClampedArray(), '_'), 'Unsupported datatype (Uint8ClampedArray) throws')

  //
  // Does not make sense to support.
  //

  t.throws(() => JSDF.serialise(new DataView(new ArrayBuffer()), '_'), 'Unsupported datatype (DataView) throws')
  t.throws(() => JSDF.serialise(new Function(), '_'), 'Unsupported datatype (Function) throws')
  t.throws(() => JSDF.serialise(new Promise((resolve, reject) => resolve()), '_'), 'Unsupported datatype (Promise) throws')
  t.throws(() => JSDF.serialise(new RegExp(), '_'), 'Unsupported datatype (RegExp) throws')

  // Generators.
  function* generator () { yield 1 }
  const generatorInstance = generator()

  t.throws(() => JSDF.serialise(generator, '_'), 'Unsupported datatype (GeneratorFunction) throws')
  t.throws(() => JSDF.serialise(generatorInstance, '_'), 'Unsupported datatype (generator instance) throws')

  t.throws(() => JSDF.serialise(new Error(), '_'), 'Unsupported datatype (Error) throws')
  t.throws(() => JSDF.serialise(new EvalError(), '_'), 'Unsupported datatype (EvalError) throws')
  t.throws(() => JSDF.serialise(new RangeError(), '_'), 'Unsupported datatype (RangeError) throws')
  t.throws(() => JSDF.serialise(new ReferenceError(), '_'), 'Unsupported datatype (ReferenceError) throws')
  t.throws(() => JSDF.serialise(new SyntaxError(), '_'), 'Unsupported datatype (SyntaxError) throws')
  t.throws(() => JSDF.serialise(new TypeError(), '_'), 'Unsupported datatype (TypeError) throws')
  t.throws(() => JSDF.serialise(new URIError(), '_'), 'Unsupported datatype (URIError) throws')

  t.end()
})
