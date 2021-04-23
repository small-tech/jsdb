# JavaScript Database (JSDB)

A zero-dependency, transparent, in-memory, streaming write-on-update JavaScript database for the Small Web that persists to a JavaScript transaction log.

## Use case

A small and simple data layer for basic persistence and querying. Built for us in [Small Web](https://ar.al/2020/08/07/what-is-the-small-web/) places and used in [Site.js](https://sitejs.org) and [Place](https://github.com/small-tech/place).

__This is not for you to farm people for their data.__ [Surveillance capitalists](https://ar.al/2020/01/01/in-2020-and-beyond-the-battle-to-save-personhood-and-democracy-requires-a-radical-overhaul-of-mainstream-technology/) can jog on now.


## Features

  - __Transparent:__ if you know how to work with arrays and objects and call methods in JavaScript, you already know how to use JSDB? It’s not called JavaScript Database for nothing.

  - __Automatic:__ it just works. No configuration.

  - __100% code coverage:__ meticulously tested. Note that this does not mean it is bug free ;)


## Limitations

  - __Small Data:__ this is for small data, not Big Data™.

  - __For Node.js:__ will not work in the browser. (Although data tables are plain ECMAScript Modules (ESM; es6 modules) and can be loaded in the browser.)

  - __Runs on untrusted nodes:__ this is for data kept on untrusted nodes (servers). Use it judiciously if you must for public data, configuration data, etc. If you want to store personal data or model human communication, consider end-to-end encrypted and peer-to-peer replicating data structures instead to protect privacy and freedom of speech. Keep an eye on the work taking place around the [Hypercore Protocol](https://hypercore-protocol.org/).

  - __In-memory:__ all data is kept in memory and, [without tweaks, cannot exceed 1.4GB in size](https://www.the-data-wrangler.com/nodejs-memory-limits/). While JSDB will work with large datasets, that’s not its primary purpose and it’s definitely not here to help you farm people for their data, so please don’t use it for that. (If that’s what you want, quite literally every other database out there is for your use case so please use one of those instead.)

  - __Streaming writes on update:__ writes are streamed to disk to an append-only transaction log as JavaScript statements and are both quick (in the single-digit miliseconds region on a development laptop with an SSD drive) and as safe as we can make them (synchronous at the kernel level).

  - __No schema, no migrations__: again, this is meant to be a very simple persistence, query, and observation layer for local server-side data. If you want schemas and migrations, take a look at nearly every other database out there.

  Note: the limitations are also features, not bugs. This is a focused tool for a specific purpose. While feature requests are welcome, I do not foresee extending its application scope.


## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.


## Installation

```
npm i github:small-tech/jsdb
```


## Usage

Here’s a quick example to whet your appetite:

```js
import JSDB from '@small-tech/jsdb'

// Create your database in the test folder.
// (This is where your JSDF files – “tables” – will be saved.)
//
const db = JSDB.open('db')

// Create db/people.js table with some initial data if it
// doesn’t already exist.
if (!db.people) {
  db.people = [
    {name: 'Aral', age: 43},
    {name: 'Laura', age: 34}
  ]

  // Correct Laura’s age. (This will automatically update db/people.js)
  db.people[1].age = 33

  // Add Oskar to the family. (This will automatically update db/people.js)
  db.people.push({name: 'Oskar', age: 8})

  // Update Oskar’s name to use his nickname. (This will automatically update db/people.js)
  db.people[2].name = 'Osky'
}
```

After running the above script, take a look at the resulting database table in the `./db/people.js` file.

(Note: all examples assume that your Node.js project has `"type": "module"` set in its `package.json` file and uses ESM modules. Adapt accordingly if you’re using CommonJS with the older 1.x branch. Not that as of version 2.0.0, JSDF files are output in ESM, not CommonJS/UMD format.)

## JavaScript Data Format (JSDF)

JSDB tables are written into JavaScript Data Format (JSDF) files. A JSDF file is a plain JavaScript file in the form of an ECMAScript Module (ESM; es6 module) that comprises an append-only transaction log which creates the table in memory. For our example, it looks like this:

```js
export const _ = [ { name: `Aral`, age: 43 }, { name: `Laura`, age: 34 } ];
_[1]['age'] = 33;
_[2] = { name: `Oskar`, age: 8 };
_[2]['name'] = `Osky`;
```

## It’s just JavaScript!

A JSDF file is just JavaScript. Specifically, it is an ECMAScript Module (ESM; es6 module).

The first line is a single assignment/export of all the data that existed in the table when it was created or last loaded.

Any changes to the table made during the last session that it was open are written, one statement per line, starting with the second line.

Since the format contains a UMD-style declaration, you can simply `require()` a JSDF file as a module in Node.js or even load it using a script tag.

For example, create an _index.html_ file with the following content in the same folder as the other script and serve it locally using [Site.js](https://sitejs.org) and you will see the data printed out in your browser:

```html
<h1>People</h1>
<ul id='people'></ul>

<script type="module">
  import { _ as people } from '/db/people.js'

  const peopleList = document.getElementById('people')

  people.forEach(person => {
    const li = document.createElement('li')
    li.innerText = `${person.name} (${person.age} years old)`
    peopleList.appendChild(li)
  })
</script>
```

__Note:__ This is version 2.0 of the JSDF format. Version 1.0 of the format was used in the earlier 1.x (CommonJS) version of JSDB and contained a [UMD](https://github.com/umdjs/umd)-style declaration. Please use the `1.x` branch if that’s what you’d prefer. That branch will continue to be maintained for as long as it is being used in [Site.js](https://sitejs.org) Migrating from version 1.0 to 2.0 is simple but is not handled automatically for you by JSDB for performance reasons. For a basic example, see [examples/jsdf-version-1.0-to-version-2.0-migration](https://github.com/small-tech/jsdb/tree/esm/examples/jsdf-version-1.0-to-version-2.0-migration).


## Supported and unsupported data types.

Just because it’s JavaScript, it doesn’t mean that you can throw anything into JSDB and expect it to work.

### Supported data types

  - `Number`
  - `Boolean`
  - `String`
  - `Object`
  - `Array`
  - `Date`
  - `Symbol`
  - [Custom data types](#custom-data-types) (see below).

Additionally, `null` and `undefined` values will be persisted as-is.

### Security note regarding strings

Strings are automatically sanitised to escape backticks, backslashes, and template placeholder tokens to avoid arbitrary code execution via JavaScript injection attacks.

The relevant areas in the codebase are linked to below.

  - [String sanitisation code (JSDF class)](https://github.com/small-tech/jsdb/blob/master/lib/JSDF.js#L45)
  - [String sanitisation code tests (test/index.js)](https://github.com/small-tech/jsdb/blob/master/test/index.js#L866)

If you notice anything we’ve overlooked or if you have suggestions for improvements, [please open an issue](https://github.com/small-tech/jsdb/issues).

### Custom data types

Custom data types (instances of your own classes) are also supported.

During serialisation, class information for custom data types will be persisted.

During deserialisation, if the class in question exists in memory, your object will be correctly initialised as an instance of that class. If the class does not exist in memory, your object will be initialised as a plain JavaScript object.

e.g.,

```js
import JSDB from '@small-tech/jsdb'

class Person {
  constructor (name = 'Jane Doe') {
    this.name = name
  }
  introduceYourself () {
    console.log(`Hello, I’m ${this.name}.`)
  }
}

const db = JSDB.open('db')

// Initialise the people table if it doesn’t already exist.
if (!db.people) {
  db.people = [
    new Person('Aral'),
    new Person('Laura')
  ]
}

// Will always print out “Hello, I’m Laura.”
// (On the first run and on subsequent runs when the objects are loaded from disk.)
db.people[1].introduceYourself()
```

If you look in the created `db/people.js` file, this time you’ll see:

```js
export const _ = [ Object.create(typeof Person === 'function' ? Person.prototype : {}, Object.getOwnPropertyDescriptors({ name: `Aral` })), Object.create(typeof Person === 'function' ? Person.prototype : {}, Object.getOwnPropertyDescriptors({ name: `Laura` })) ];
```

If you were to load the database in an environment where the `Person` class does not exist, you will get a regular object back.

To test this, you can run the following code:

```js
import JSDB from '@small-tech/jsdb'
const db = JSDB.open('db')

// Prints out { name: 'Laura' }
console.log(db.people[1])
```

You can find these examples in the `examples/custom-data-types` folder of the source code.

### Unsupported data types

If you try to add an instance of an unsupported data type to a JSDB table, you will get a `TypeError`.

The following data types are currently unsupported but might be supported in the future:

  - `Map` (and `WeakMap`)
  - `Set` (and `WeakSet`)
  - Binary collections (`ArrayBuffer`, `Float32Array`, `Float64Array`, `Int8Array`, `Int16Array`, `Int32Array`, `TypedArray`, `Uint8Array`, `Uint16Array`, `Uint32Array`, and `Uint8ClampedArray`)

The following intrinsic objects are not supported as they don’t make sense to support:

  - Intrinsic objects (`DataView`, `Function`, `Generator`, `Promise`, `Proxy`, `RegExp`)
  - Error types (`Error`, `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`, and `URIError`)

## Important security note

__JSDF is _not_ a data exchange format.__

Since JSDF is made up of JavaScript code that is evaluated at run time, you must only load JSDF files from domains that you own and control and have a secure connection to.

__Do not load in JSDF files from third parties.__

If you need a data _exchange_ format, use [JSON](https://www.json.org/json-en.html).

Rule of thumb:

  - JSON is a terrible format for a database but a great format for data exchange.
  - JSDF is a terrible format for data exchange but a great format for a JavaScript database.

## JavaScript Query Language (JSQL)

In the browser-based example, above, you loaded the data in directly. When you do that, of course, you are not running it inside JSDB so you cannot update the data or use the JavaScript Query Language (JSQL) to query it.

To test out JSQL, open a Node.js command-line interface (run `node`) from the directory that your scripts are in and enter the following commands:

```js
import JSDB from '@small-tech/jsdb'

// This will load test database with the people table we created earlier.
const db = JSDB.open('db')

// Let’s carry out a query that should find us Osky.
console.log(db.people.where('age').isLessThan(21).get())
```

Note that you can only run queries on arrays. Attempting to run them on plain or custom objects (that are not subclasses of `Array`) will result in a `TypeError`. Furthermore, queries only make sense when used on arrays of objects. Running a query on an array of simple data types will not throw an error but will return an empty result set.

For details, see the [JSQL Reference](#jsql-reference) section.


## Compaction

When you load in a JSDB table, by default JSDB will compact the JSDF file.

Compaction is important for two reasons; during compaction:

  - Deleted data is actually deleted from disk. (Privacy.)
  - Old versions of updated data are actually removed. (Again, privacy.)

Compaction may thus also reduce the size of your tables.

Compaction is a relatively fast process but it does get uniformly slower as the size of your database grows (it has O(N) time complexity as the whole database is recreated).

You do have the option to override the default behaviour and keep all history. You might want to do this, for example, if you’re creating a web app that lets you create a drawing and you want to play the drawing back stroke by stroke, etc.

Now that you’ve loaded the file back, look at the `./db/people.js` JSDF file again to see how it looks after compaction:

```js
export const _ = [ { name: `Aral`, age: 43 }, { name: `Laura`, age: 33 }, { name: `Osky`, age: 8 } ];
```

Ah, that is neater. Laura’s record is created with the correct age and Oskar’s name is set to its final value from the outset. And it all happens on the first line, in a single assignment. Any new changes will, just as before, be added starting with the third line.

(You can find these examples in the `examples/basic` folder of the source code.)


## Closing a database

Your database tables will be automatically closed if you exit your script. However, there might be times when you want to manually close a database (for example, to reopen it with different settings, etc.) In that case, you can call the asynchronous `close()` method on the database proxy.

Here’s what you’d do to close the database in the above example:

```js
async main () {
  // … 🠑 the earlier code from the example, above.

  await db.close()

  // The database and all of its tables are now closed.
  // It is now safe (and allowed) to reopen it.
}

main()
```

## Working with JSON

As mentioned earlier, JSDB writes out its tables as append-only logs of JavaScript statements in what we call JavaScript Data Format (JSDF). This is not the same as [JavaScript Object Notation (JSON)](https://www.json.org/json-en.html).

JSON is not a good format for a database but it is excellent – not to mention ubiquitous – for its original use case of data exchange. You can easily find or export datasets in JSON format. And using them in JSDB is effortless. Here’s an example that you can find in the `examples/json` folder of the source code:

Given a JSON data file of spoken languages by country in the following format:

```json
[
  {
    "country": "Aruba",
    "languages": [
      "Dutch",
      "English",
      "Papiamento",
      "Spanish"
    ]
  },
  {
    "etc.": "…"
  }
]
```

The following code will load in the file, populate a JSDB table with it, and perform a query on it:

```js
import fs from 'fs'
import JSDB from '@small-tech/jsdb'

const db = JSDB.open('db')

// If the data has not been populated yet, populate it.
if (!db.countries) {
  const countries = JSON.parse(fs.readFileSync('./countries.json', 'utf-8'))
  db.countries = countries
}

// Query the data.
const countriesThatSpeakKurdish = db.countries.where('languages').includes('Kurdish').get()

console.log(countriesThatSpeakKurdish)
```

When you run it, you should see the following result:

```js
[
  {
    country: 'Iran',
    languages: [
      'Arabic',    'Azerbaijani',
      'Bakhtyari', 'Balochi',
      'Gilaki',    'Kurdish',
      'Luri',      'Mazandarani',
      'Persian',   'Turkmenian'
    ]
  },
  {
    country: 'Iraq',
    languages: [ 'Arabic', 'Assyrian', 'Azerbaijani', 'Kurdish', 'Persian' ]
  },
  { country: 'Syria', languages: [ 'Arabic', 'Kurdish' ] },
  { country: 'Turkey', languages: [ 'Arabic', 'Kurdish', 'Turkish' ] }
]
```

The code for this example is in the `examples/json` folder of the source code.

## Dispelling the magic and a pointing out a couple of gotchas

Here are a couple of facts to dispel the magic behind what’s going on:

  - What we call a _database_ in JSDB is just a regular directory on your file system.
  - Inside that directory, you can have zero or more tables.
  - A table is a JSDF file.
  - A JSDF file is an ECMAScript Module (ESM; es6 module) that exports a root data structure (either an object or an array) that may or may not contain data and a sequence of JavaScript statements that mutate it. It is an append-only transaction log that is compacted at load. JSDF files are valid JavaScript files and should import and run correctly under any JavaScript interpreter that supports ESM.
  - When you open a database, you get a Proxy instance back, not an instance of JSDB.
  - Similarly, when you reference a table or the data within it, you are referencing proxy objects, not the table instance or the data itself.

### How the sausage is made

When you open a database, JSDB loads in any `.js` files it can find in your database directory. Doing so creates the data structures defined in those files in memory. Alongside, JSDB also creates a structure of [proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) that mirrors the data structure and traps (captures) calls to get, set, or delete values. Every time you set or delete a value, the corresponding JavaScript statement is appended to your table on disk.

By calling the `where()` or `whereIsTrue()` methods, you start a [query](#jsql-reference). Queries help you search for specific bits of data. They are implemented using the get traps in the proxy.

### Gotchas and limitations

Given that a core goal for JSDB is to be transparent, you will mostly feel like you’re working with regular JavaScript collections (objects and arrays) instead of a database. That said, there are a couple of gotchas and limitations that arise from the use of proxies and the impedance mismatch between synchronous data manipulation in JavaScript and the asynchronous nature of file handling:

  1. __You can only have one copy of a database open at one time.__ Given that tables are append-only logs, having multiple streams writing to them would corrupt your tables. The JSDB class enforces this by forcing you to use the `open()` factory method to create or load in your databases.

  2. __You cannot reassign a value to your tables without first deleting them.__ Since assignment is a synchronous action and since we cannot safely replace the existing table on disk with a different one synchronously, you must first call the asynchronous `delete()` method on a table instance before assigning a new value for it on the database, thereby creating a new table.

      ```js
      async main () {
        // … 🠑 the earlier code from the example, above.

        await db.people.delete()

        // The people table is now deleted and we can recreate it.

        // This is OK.
        db.people = [
          {name: 'Ed Snowden', age: 37}
        ]

        // This is NOT OK.
        try {
          db.people = [
            {name: 'Someone else', age: 100}
          ]
        } catch (error) {
          console.log('This throws as we haven’t deleted the table first.')
        }
      }

      main()
      ```

  3. __There are certain reserved words you cannot use in your data.__ This is a trade-off between usability and polluting the mirrored proxy structure. JSDB strives to keep reserved words to a minimum.

        This is the full list:

        |                            | Reserved words                                                                 |
        | -------------------------- | ------------------------------------------------------------------------------ |
        | __As table name__          | `close`                                                                        |
        | __Property names in data__ | `where`, `whereIsTrue`, `addListener`, `removeListener`, `delete`, `__table__` |

        Note: You can use the `__table__` property from any level of your data to get a reference to the table instance (`JSTable` instance) that it belongs to. This is mostly for internal use but it’s there if you need it.

### Table events

You can listen for the following events on tables:

| Event name | Description                           |
| ---------- | ------------------------------------- |
| persist    | The table has been persisted to disk. |
| delete     | The table has been deleted from disk. |

#### Example

The following handler will get called whenever a change is persisted to disk for the `people` table:

```js
db.people.addListener('persist', (table, change) => {
  console.log(`Table ${table.tableName} persisted change ${change.replace('\n', '')} to disk.`)
})
```


## JSQL Reference

The examples in the reference all use the following random dataset. _Note, I know nothing about cars, the tags are also arbitrary. Don’t @ me ;)_

```js
const cars = [
  { make: "Subaru", model: "Loyale", year: 1991, colour: "Fuscia", tags: ['fun', 'sporty'] },
  { make: "Chevrolet", model: "Suburban 1500", year: 2004, colour: "Turquoise", tags: ['regal', 'expensive'] },
  { make: "Honda", model: "Element", year: 2004, colour: "Orange", tags: ['fun', 'affordable'] },
  { make: "Subaru", model: "Impreza", year: 2011, colour: "Crimson", tags: ['sporty', 'expensive']},
  { make: "Hyundai", model: "Santa Fe", year: 2009, colour: "Turquoise", tags: ['sensible', 'affordable'] },
  { make: "Toyota", model: "Avalon", year: 2005, colour: "Khaki", tags: ['fun', 'affordable']},
  { make: "Mercedes-Benz", model: "600SEL", year: 1992, colour: "Crimson", tags: ['regal', 'expensive', 'fun']},
  { make: "Jaguar", model: "XJ Series", year: 2004, colour: "Red", tags: ['fun', 'expensive', 'sporty']},
  { make: "Isuzu", model: "Hombre Space", year: 2000, colour: "Yellow", tags: ['sporty']},
  { make: "Lexus", model: "LX", year: 1997, colour: "Indigo", tags: ['regal', 'expensive', 'AMAZING'] }
]
```

### Starting a query (the `where()` method)

```js
const carsMadeIn1991 = db.cars.where('year').is(1991).get()
```

The `where()` method starts a query.

You call it on a table reference. It takes a property name (string) as its only argument and returns a query instance.

On the returned query instance, you can call various operators like `is()` or `startsWith()`.

Finally, to invoke the query you use one one of the invocation methods: `get()`, `getFirst()`, or `getLast()`.

### The anatomy of a query.

Idiomatically, we chain the operator and invocation calls to the `where` call and write our queries out in a single line as shown above. However, you can split the three parts up, should you so wish. Here’s such an example, for academic purposes.

This starts the query and returns an incomplete query object:

```js
const incompleteCarYearQuery = db.cars.where('year')
```

Once you call an operator on a query, it is considered complete:

```js
const completeCarYearQuery = incompleteCarYearQuery.is(1991)
```

To execute a completed query, you can use one of the invocation methods: `get()`, `getFirst()`, or `getLast()`.

Note that `get()` returns an array of results (which might be an empty array) while `getFirst()` and `getLast()` return a single result (which may be `undefined`).

```js
const resultOfCarYearQuery = completeCarYearQuery.get()
```

Here are the three parts of a query shown together:

```js
const incompleteCarYearQuery = db.cars.where('year')
const completeCarYearQuery = incompleteCarYearQuery.is(1991)
const resultOfCarYearQuery = completeCarYearQuery.get()
```

Again, idiomatically, we chain the operator and invocation calls to the `where()` call and write our queries out in a single line like this:

```js
const carsMadeIn1991 = db.cars.where('year').is(1991).get()
```

### Connectives (`and()` and `or()`)

You can chain conditions onto a query using the connectives `and()` and `or()`. Using a connective transforms a completed query back into an incomplete query awaiting an operator. e.g.,

```js
const veryOldOrOrangeCars = db.cars.where('year').isLessThan(2000).or('colour').is('Orange').get()
```

#### Example

```js
const carsThatAreFunAndSporty = db.cars.where('tags').includes('fun').and('tags').includes('sporty').get()
```

#### Result

```js
[
  { make: "Subaru", model: "Loyale", year: 1991, colour: "Fuscia", tags: ['fun', 'sporty'] },
  { make: "Jaguar", model: "XJ Series", year: 2004, colour: "Red", tags: ['fun', 'expensive', 'sporty']},
]
```

### Custom queries (`whereIsTrue()`)

For more complex queries – for example, if you need to include parenthetical grouping – you can compose your JSQL by hand. To do so, you call the `whereIsTrue()` method on a table instead of the `where()` method and you pass it a full JSQL query string. A completed query is returned.

When writing your custom JSQL query, prefix property names with `valueOf.`.

Note that custom queries are inherently less safe as you are responsible for sanitising input at the application level to avoid leaking sensitive data. (Basic sanitisation to avoid arbitrary code execution is handled for you by JSDB). Make sure you read through the Security considerations with queries](#security-considerations-with-queries) section if you’re going to use custom queries.

#### Example

```js
const customQueryResult = db.cars.whereIsTrue(`(valueOf.tags.includes('fun') && valueOf.tags.includes('affordable')) || (valueOf.tags.includes('regal') && valueOf.tags.includes('expensive'))`).get()
```

#### Result

```js
[
  { make: 'Chevrolet', model: 'Suburban 1500', year: 2004, colour: 'Turquoise', tags: [ 'regal', 'expensive' ] },
  { make: 'Honda', model: 'Element', year: 2004, colour: 'Orange', tags: [ 'fun', 'affordable' ] },
  { make: 'Toyota', model: 'Avalon', year: 2005, colour: 'Khaki', tags: [ 'fun', 'affordable' ] },
  { make: 'Mercedes-Benz', model: '600SEL', year: 1992, colour: 'Crimson', tags: [ 'regal', 'expensive', 'fun' ] },
  { make: 'Lexus', model: 'LX', year: 1997, colour: 'Indigo', tags: [ 'regal', 'expensive', 'AMAZING' ] }
]
```

### Relational operators

  - `is()`, `isEqualTo()`, `equals()`
  - `isNot()`, `doesNotEqual()`
  - `isGreaterThan()`
  - `isGreaterThanOrEqualTo()`
  - `isLessThan()`
  - `isLessThanOrEqualTo()`

Note: operators listed on the same line are aliases and may be used interchangeably (e.g., `isNot()` and `doesNotEqual()`).

#### Example (is)

```js
const carWhereYearIs1991 = db.cars.where('year').is(1991).getFirst()
```

#### Result (is)

```js
{ make: "Subaru", model: "Loyale", year: 1991, colour: "Fuscia", tags: ['fun', 'sporty'] }
```

#### Example (isNot)

```js
const carsWhereYearIsNot1991 = db.cars.where('year').isNot(1991).get()
```

#### Result (isNot)

```js
[
  { make: "Chevrolet", model: "Suburban 1500", year: 2004, colour: "Turquoise", tags: ['regal', 'expensive'] },
  { make: "Honda", model: "Element", year: 2004, colour: "Orange", tags: ['fun', 'affordable'] },
  { make: "Subaru", model: "Impreza", year: 2011, colour: "Crimson", tags: ['sporty', 'expensive']},
  { make: "Hyundai", model: "Santa Fe", year: 2009, colour: "Turquoise", tags: ['sensible', 'affordable'] },
  { make: "Toyota", model: "Avalon", year: 2005, colour: "Khaki", tags: ['fun', 'affordable'] },
  { make: "Mercedes-Benz", model: "600SEL", year: 1992, colour: "Crimson", tags: ['regal', 'expensive', 'fun'] },
  { make: "Jaguar", model: "XJ Series", year: 2004, colour: "Red", tags: ['fun', 'expensive', 'sporty'] },
  { make: "Isuzu", model: "Hombre Space", year: 2000, colour: "Yellow", tags: ['sporty'] },
  { make: "Lexus", model: "LX", year: 1997, colour: "Indigo", tags: ['regal', 'expensive', 'AMAZING'] }
]
```

Note how `getFirst()` returns the first item (in this case, an _object_) whereas `get()` returns the whole _array_ of results.

The other relational operators work the same way and as expected.

### String subset comparison operators

  - `startsWith()`
  - `endsWith()`
  - `includes()`
  - `startsWithCaseInsensitive()`
  - `endsWithCaseInsensitive()`
  - `includesCaseInsensitive()`

The string subset comparison operators carry out case sensitive string subset comparisons. They also have case insensitive versions that you can use.

#### Example (`includes()` and `includesCaseInsensitive()`)

```js
const result1 = db.cars.where('make').includes('su').get()
const result2 = db.cars.where('make').includes('SU').get()
const result3 = db.cars.where('make').includesCaseInsensitive('SU')
```

#### Result 1

```js
[
  { make: "Isuzu", model: "Hombre Space", year: 2000, colour: "Yellow", tags: ['sporty']}
]
```

Since `includes()` is case sensitive, the string `'su`' matches only the make `Isuzu`.

#### Result 2

```js
[]
```

Again, since `includes()` is case sensitive, the string `'SU`' doesn’t match the make of any of the entries.

#### Result 3

```js
[
  { make: "Subaru", model: "Impreza", year: 2011, colour: "Crimson", tags: ['sporty', 'expensive'] },
  { make: "Isuzu", model: "Hombre Space", year: 2000, colour: "Yellow", tags: ['sporty'] }
]
```

Here, `includesCaseInsensitive('SU')` matches both the `Subaru` and `Isuzu` makes due to the case-insensitive string comparison.

### Array inclusion check operator

  - `includes()`

The `includes()` array inclusion check operator can also be used to check for the existence of an object (or scalar value) in an array.

Note that the `includesCaseInsensitive()` string operator cannot be used for this purpose and will throw an error if you try.

#### Example (`includes()` array inclusion check):

```js
const carsThatAreRegal = db.cars.where('tags').includes('regal').get()
```

#### Result (`includes()` array inclusion check)

```js
[
  { make: "Chevrolet", model: "Suburban 1500", year: 2004, colour: "Turquoise", tags: ['regal', 'expensive'] },
  { make: "Mercedes-Benz", model: "600SEL", year: 1992, colour: "Crimson", tags: ['regal', 'expensive', 'fun']},
  { make: "Lexus", model: "LX", year: 1997, colour: "Indigo", tags: ['regal', 'expensive', 'AMAZING'] }
]
```

### Security considerations with queries

JSDB (as of version 1.1.0), attempts to carry out basic sanitisation of your queries for you to avoid [Little Bobby Tables](https://xkcd.com/327/).

That said, you should still sanitise your queries at the application level, if you’re using custom queries via `whereIsTrue()`. Basic sanitisation will protect you from arbitrary code execution but it will not protect you from, for example, someone passing `|| valueOf.admin === true` to attempt to access private information. You should be vigilant in your sanitisation when using `whereIsTrue()` and stick to using `where()` whenever possible.

The current sanitisation strategy is two-fold and is executed at time of query execution:

  1. Remove dangerous characters (statement terminators, etc.):

      - Semi-colon (`;`)
      - Backslash (`\`)
      - Backtick (`` ` ``)
      - Plus sign (`+`)
      - Dollar sign (`$`)
      - Curly brackets (`{}`)

      Reasoning: remove symbols that could be used to create valid code so that if our sieve (see below) doesn’t catch an attempt, the code will throw an error when executed, which we can catch and handle.

  2. Use a sieve to remove expected input. If our sieve contains any leftover material, we immediately return an empty result set without executing the query.

During query execution, if the query throws (due to an injection attempt that was neutralised at Step 1 but made it through the sieve), we simply catch the error and return an empty result set.

The relevant areas in the codebase are linked to below.

  - [Query sanitisation code (QueryProxy class)](https://github.com/small-tech/jsdb/blob/master/lib/QueryProxy.js#L43)
  - [Query sanitisation code (QuerySanitiser class)](https://github.com/small-tech/jsdb/blob/master/lib/QuerySanitiser.js)
  - [Query sanitisation code tests (test/index.js)](https://github.com/small-tech/jsdb/blob/master/test/index.js#L683)

If you notice anything we’ve overlooked or if you have suggestions for improvements, [please open an issue](https://github.com/small-tech/jsdb/issues).

## Performance characteristics

  - The time complexity of reads and writes are both O(1).
  - Reads are fast (take fraction of a millisecond and are about an order of magnitude slower than direct memory reads).
  - Writes are fast (in the order of a couple of milliseconds on tests on a dev machine).
  - Initial table load time and full table write/compaction times are O(N) and increase linearly as your table size grows.

## Suggested limits

  - Break up your database into multiple tables whenever possible.
  - Keep your table sizes under 100MB.

## Hard limits

  - Your database size is limited by available memory.
  - If your database size is larger than > ~1.3GB, you should start your node process with a larger heap size than the default (~1.4GB). E.g., to set aside 8GB of heap space:

  ```
  node --max-old-space-size=8192 why-is-my-database-so-large-i-hope-im-not-doing-anything-shady.js
  ```
## Memory Usage

The reason JSDB is fast is because it keeps the whole database in memory. Also, to provide a transparent persistence and query API, it maintains a parallel object structure of proxies. This means that the amount of memory used will be multiples of the size of your database on disk and exhibits O(N) memory complexity.

Initial load time and full table write/compaction both exhibit O(N) time complexity.

For example, here’s just one sample from a development laptop using the simple performance example in the `examples/performance` folder of the source code which creates random records that are around ~2KB in size each:

| Number of records | Table size on disk | Memory used | Initial load time | Full table write/compaction time |
| ----------------- | ------------------ | ----------- | ----------------- | -------------------------------- |
| 1,000             | 2.5MB              | 15.8MB      | 85ms              | 45ms                             |
| 10,000            | 25MB               | 121.4MB     | 845ms             | 400ms                            |
| 100,000           | 250MB              | 1.2GB       | 11 seconds        | 4.9 seconds                      |

(The baseline app used about 14.6MB without any table in memory. The memory used column subtracts that from the total reported memory so as not to skew the smaller dataset results.)

Note: For tables > 500GB, compaction is turned off and a line-by-line streaming load strategy is implemented. If you foresee your tables being this large, you (a) are probably doing something nasty (and won’t mind me pointing it out if you’re not) and (b) should turn off compaction from the start for best performance. Keeping compaction off from the start will decrease initial table load times. Again, don’t use this to invade people’s privacy or profile them.

## Development

Please open an issue before starting to work on pull requests.

### Testing

1. Clone this repository.
2. `npm i`
3. `npm test`

For code coverage, run `npm run coverage`.

__Note:__ `lib/LineByLine.js` is excluded from coverage as it is the inlined version of [n-readlines](https://github.com/nacholibre/node-readlines). The tests for it can be found as part of that library.

Also, as JSDB has no runtime dependencies, you only have to run `npm i` if you want to run the test or make a distribution build.

### Building

You can now build a 32KB distribution version of the module:

```sh
npm run build
```

Find the distribution build in `dist/index.js`.

To run the tests on the distribution build, use `npm run test-dist`.

## Ideas for post 2.0.0.

  - [ ] __Implement [transactions](https://github.com/small-tech/jsdb/issues/1).__
  - [ ]  ╰─ Ensure 100% code coverage for transactions.
  - [ ]  ╰─ Document transactions.
  - [ ]  ╰─ Add transaction example.
  - [ ] __Implement indices.__
  - [ ]  ╰─ Ensure 100% code coverage for indices.
  - [ ]  ╰─ Document indices.
  - [ ]  ╰─ Add indices example.

## Related projects, inspiration, etc.

  - [Initial brainstorming (query language)](https://gist.github.com/aral/fc4115fdf338e02d735ae58e245817ce)
  - [proxy-fun](https://github.com/mikaelbr/awesome-es2015-proxy)
  - [filejson](https://github.com/bchr02/filejson)
  - [Declaraoids](https://github.com/Matsemann/Declaraoids/blob/master/src/declaraoids.js)
  - [ScunMEngine](https://github.com/jlvaquero/SCUNM/blob/master/SCUNMEngine/SCUNMEngine.js)

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Copyright

&copy; 2020-2021 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).
