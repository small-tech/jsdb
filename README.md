# JavaScript Database (JSDB)

__Work in progress:__ A transparent, in-memory, streaming write-on-update JavaScript database for Small Web applications that persists to a JavaScript transaction log.

__Needless to say, this is not ready for use yet. But feel free to take a look around.__

## Roadmap to version 1.0.0.

  - [x] __Implement persistence.__ (15 Sept)
  - [x]  ╰─ Add unit tests for persistence. (19 Sept)
  - [x]  ╰─ Document persistence. (19 Sept)
  - [x]  ╰─ Add persistence example. (19 Sept)
  - [x] __Implement queries.__ (22 Sept)
  - [x]  ╰─ Add queries example. (22 Sept)
  - [x] __Refactor to implement persistence as append-only JavaScript transaction log and use streaming writes.__ (29 Sept)
  - [x]  ╰─  Update documentation to reflect new persistence engine. (29 Sept)
  - [x]  ╰─  Update examples to work with new persistence engine. (30 Sept)
  - [x] __Continue working on queries.__ (1 Oct)
  - [x]  ╰─ Add unit tests for queries. (1 Oct)
  - [x]  ╰─ Document queries. (1 Oct)
  - [ ] __Bring code coverage back up to 100%.__ _(in progress)_
  - [ ] __Implement transactions.__
  - [ ]  ╰─ Ensure 100% code coverage for transactions.
  - [ ]  ╰─ Document transactions.
  - [ ] __Decide whether indices are important / essential for 1.0.0.__
  - [ ]  ╰─ Implement indices.
  - [ ]       ╰─ Ensure 100% code coverage for indices.
  - [ ]       ╰─ Document indices.
  - [ ]       ╰─ Add indices example.
  - [ ] __Use/test on upcoming small-web.org site__
  - [ ] __Release version 1.0.0__


## To install

Currently, you need to clone the repo as this is a work-in-progress and no releases have been made yet.

## Usage

Here’s a quick example to whet your appetite:

```js
const JSDB = require('.')

// Create your database in the test folder.
// (This is where your JSON files – “tables” – will be saved.)
const db = new JSDB('db')

// Create test/people.json with some data.
db.people = [
  {name: 'Aral', age: 43},
  {name: 'Laura', age: 34}
]

// Correct Laura’s age. (This will automatically update db/people.js)
db.people[1].age = 33

// Add Oskar to the family. (This will automatically update db/people.js)
db.people.push({name: 'Oskar', age: 8})
```

After running the above script, take a look at the resulting database table in the `./db/people.js` file.

## JavaScript Data Format (JSDF)

JSDB tables are written into JavaScript Data Format (JSDF) files. A JSDF file is a plain JavaScript file that comprises an append-only transaction log that creates the table in memory. For our example, it looks like this:

```js
globalThis._ = [];
(function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.people = globalThis._ } })();
_[0] = JSON.parse(`{"name":"Aral","age":43}`);
_[1] = JSON.parse(`{"name":"Laura","age":34}`);
_[1]['age'] = 33;
_[2] = JSON.parse(`{"name":"Oskar","age":8}`);
_['length'] = 3;
_[2]['name'] = `Osky`;
```

(Note: the format is a work-in-progress like the rest of the project at the moment. I am considering cleaning up the superfluous length statements and weighing up the performance hit of maintaining state to enable that versus the potential use cases of a cleaner log – like history replay for example – and file size/initial load speed, which is really not too much of a concern given that they occur at server start for our use cases).

## It’s just JavaScript!

Given that a JSDF file is just JavaScript, and includes a [UMD](https://github.com/umdjs/umd)-like declaration in its header (the first two lines), you can simply `require()` it as a module in Node.js or even load it in a script tag.

For example, create an _index.html_ file with the following content in the same folder as the other script and serve it locally using [Site.js](https://sitejs.org) and you will see the data printed out in your browser:

```html
<script src="db/people.js"></script>
<h1>People</h1>
<ul>
<script>
  people.forEach(person => {
    document.write(`<li>${person.name} (${person.age} years old)</li>`)
  })
</script>
</ul>
```

## JavaScript Query Language (JSQL)

Of course, when you load the data in directly, you are not running it inside JSDB so you cannot update the data or use the JavaScript Query Language (JSQL) to query it.

To test that out, open a Node.js command-line interface (run `node`) from the directory that your scripts are in and enter the following commands:

```js
const JSDB = require('.')

// This will load test database with the people table we created earlier.
const db = new JSDB('db')

// Let’s carry out a query that should find us Osky.
console.log(db.people.where('age').isLessThan(21).get())
```

For details, see the [JSQL Reference](#jsql-reference) section.

## Compaction

When you load in a JSDB table, by default JSDB will compact the JSDF file.

Compaction is important for two reasons:

  - It is when deleted data is actually deleted from disk. (Privacy.)
  - It is when old version of updated data are actually removed. (Again, privacy.)

Compaction will also reduce the size of your tables.

You do have the option to override the default behaviour and keep all history. You might want to do this, for example, if you’re creating a web app that lets you create a drawing and you want to play the drawing back stroke by stroke, etc.

Now that you’ve loaded the file back, look at the `./db/people.js` JSDF file again to see how it looks after compaction:

```js
globalThis._ = [];
(function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.people = globalThis._ } })();
_[0] = JSON.parse(`{"name":"Aral","age":43}`);
_[1] = JSON.parse(`{"name":"Laura","age":33}`);
_[2] = JSON.parse(`{"name":"Osky","age":8}`);
```

Ah, that is neater. You can see that Laura’s record is created with the correct age from the outset and Oskar’s name is set at Osky from the outset also.

(You can find these examples in the `examples/basic` folder of the source code.)

## Use case

A data layer for simple [Small Web](https://ar.al/2020/08/07/what-is-the-small-web/) sites for basic public (e.g., anonymous comments on articles) or configuration data. Built for use in [Site.js](https://sitejs.org).

__Not to farm people for their data.__ Surveillance capitalists can jog on now.

## Features

  - __Transparent:__ if you know how to work with arrays and objects and call methods in JavaScript, you already know how to use JSDB? It’s not called JavaScript Database for nothing.

  - __Automatic:__ it just works. No configuration.

## Limitations

  - __Small Data:__ this is for small data, not Big Data™.

  - __For Node.js:__ will not work in the browser. (Although the data table can be loaded in the browser.)

  - __Runs on untrusted nodes:__ this is for data kept on untrusted (server) nodes. Use it judiciously if you must for public data, configuration data, etc. If you want to store personal data or model human communication, consider end-to-end encrypted and peer-to-peer replicating data structures instead to protect privacy and freedom of speech. Keep an eye on the work taking place around the [Hypercore Protocol](https://hypercore-protocol.org/).

  - __In-memory:__ all data is kept in memory and, [without tweaks, cannot exceed 1.4GB in size](https://www.the-data-wrangler.com/nodejs-memory-limits/). While JSDB will work with large datasets, that’s not its primary purpose and it’s definitely not here to help you farm people for their data, so please don’t use it for that. (If that’s what you want, quite literally every other database out there is for your use case so please use one of those instead.)

  - __Streaming writes on update:__ writes are streamed to disk to an append-only transaction log as JavaScript statements and are both quick (in the single-digit miliseconds region on my development laptop with an SSD drive) and as safe as we can make them (synchronous as the kernel level).

  - __No schema, no migrations__: again, this is meant to be a very simple persistence, query, and observation layer for local server-side data. If you want schemas and migrations, take a look at nearly every other database out there.

## Events

Given that a core goal for JSDB is to be transparent, you will mostly feel like you’re working with regular JavaScript collections (objects and arrays). At times, however, it might be useful to have access to the underlying abstractions like the table object. One of those instances is if you want to be notified of events.

To listen for an event, access the special `__table__` property of your collection. e.g.,

```js
db.people.__table__.addListener('persist', (table, change) => {
  console.log(`Table ${table.tableName} persisted change ${change.replace('\n', '')} to disk.`)
})
```

### Table events

| Event name | Description                           |
| ---------- | ------------------------------------- |
| persist    | The table has been persisted to disk. |

## JSQL Reference

The examples in the reference all use the following random dataset. Note, I know nothing about cars, the tags are also arbitrary. Don’t @ me ;)

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

## Performance characteristics

  - The time complexity of reads and writes are both O(1).
  - Reads are fast (take fraction of a millisecond and are about an order of magnitude slower than direct memory reads).
  - Writes are fast (in the order of a couple of milliseconds on tests on my dev machine).

## Limits

  - Your database size is limited by available memory.
  - If your database size is larger than > 1GB, you should start your node process with a larger heap size than the default (~1.4GB). E.g., to set aside 8GB of heap space:

  ```
  node --max-old-space-size=8192 why-is-my-database-so-large-i-hope-im-not-doing-anything-shady.js
  ```

## Memory Usage

The reason JSDB is fast is because it keeps the whole database in memory. Also, to provide a transparent persistence and query API, it maintains a parallel object structure of proxies. This means that the amount of memory used will be multiples of the size of your database on disk and exhibits O(N) memory complexity.

Initial load time and full table write/compaction both exhibit O(N) time complexity.

For example, here’s just one sample from a development laptop using the simple performance example in the examples folder which creates random records around ~2KB in size each:

| Number of records | Table size on disk | Memory used | Initial load time | Full table write/compaction time |
| ----------------- | ------------------ | ----------- | ----------------- | -------------------------------- |
| 1,000             | 2.5MB              | 15.8MB      | 41.6ms            | 2.7 seconds                      |
| 10,000            | 25MB               | 121.4MB     | 380.2ms           | 26 seconds                       |
| 100,000           | 244MB              | 1.2GB       | 5.5 seconds       | 4.6 minutes                      |

(The baseline app used about 14.6MB without any table in memory. The memory used column subtracts that from the total reported memory so as not to skew the smaller dataset results.)

## Developing

Please open an issue before starting to work on pull requests.

1. Clone this repository.
2. `npm i`
3. `npm test`

For code coverage, run `npm run coverage`.

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

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).
