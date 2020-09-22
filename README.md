# WhatDB?

__Work in progress:__ A transparent, in-memory, write-on-update JavaScript database for Small Web applications that persists to JSON files.

For initial brainstorming, see [this gist](https://gist.github.com/aral/fc4115fdf338e02d735ae58e245817ce).

__Needless to say, this is not ready for use yet. But feel free to take a look around.__

## Roadmap

  - [*] Implement persistence (15 Sept)
  - [*] Add unit tests for persistence (19 Sept)
  - [*] Document persistence (19 Sept)
  - [*] Add persistence example (19 Sept)
  - [*] Implement queries (22 Sept)
  - [ ] Add unit tests for queries
  - [ ] Document queries
  - [ ] Add queries example
  - [ ] Implement indices
  - [ ] Add unit tests for indices
  - [ ] Document indices
  - [ ] Add indices example
  - [ ] Use/test on upcoming small-web.org site
  - [ ] Release version 1.0

## To install

Currently, you need to clone the repo as this is a work-in-progress and no releases have been made yet.

## Usage

Here’s a quick example to whet your appetite:

```js
const WhatDB = require('.')

// Create your database in the test folder.
// (This is where your JSON files – “tables” – will be saved.)
const db = new WhatDB('db')

// Create test/people.json with some data.
db.people = [
  {name: 'Aral', age: 43},
  {name: 'Laura', age: 34}
]

// Correct Laura’s age. (This will automatically update test/people.json)
db.people[1].age = 33

// Add Oskar to the family. (This will automatically update test/people.json)
db.people.push({name: 'Oskar', age: 8})
```

After running the above script, try this one:

```js
const WhatDB = require('.')

// This will load test database with the people table we created earlier.
const db = new WhatDB('db')

// Let’s make sure Oskar’s in there… ;)
console.log(db.people[2])
```

(You can find these in the `examples/basic` folder of the source code, in the `run-me-first.js` and `run-me-next.js` scripts, respectively.)

## Use case

A data layer for simple [Small Web](https://ar.al/2020/08/07/what-is-the-small-web/) sites for basic public (e.g., anonymous comments on articles) or configuration data. Built for use in [Site.js](https://sitejs.org).

## Features

  - __Transparent:__ if you know how to work with arrays and objects and call methods in JavaScript, you already know how to use WhatDB? It’s not called “What database?” for nothing. Database? What database?

  - __Automatic:__ it just works. No configuration.

## Limitations

  - __Small Data:__ this is for small data, not Big Data™.

  - __For Node.js:__ will not work in the browser.

  - __Runs on untrusted nodes:__ this is for data kept on untrusted (server) nodes. Use it judiciously if you must for public data, configuration data, etc. If you want to store personal data or model human communication, consider end-to-end encrypted and peer-to-peer replicating data structures instead to protect privacy and freedom of speech. Keep an eye on the work taking place around the [Hypercore Protocol](https://hypercore-protocol.org/).

  - __In-memory:__ all data is kept in memory and, [without tweaks, cannot exceed 1.4GB in size](https://www.the-data-wrangler.com/nodejs-memory-limits/). If your local database is > 1 GB in size, you’re not really building a Small Web site/app and this is not the tool for you. Quite literally every other database out there is for your use case so please don’t open an issue here for this reason.

  - __Write-on-update__: every update will trigger a full flush of the database to disk (unless a write is already in process, in which case updates that take place during a write will be batch written together). So this is not what you should be using for, say, logging. Use an append-only log for that instead.

  - __No schema, no migrations__: again, this is meant to be a very simple persistence, query, and observation layer for local data. If you want schemas and migrations, take a look at nearly every other database out there. You might also want to see how well [ObjectModel](https://github.com/sylvainpolletvillard/ObjectModel) works alongside WhatDB.

## Events

Given that a core goal for WhatDB is to be transparent, you will mostly feel like you’re working with regular JavaScript collections (objects and arrays). At times, however, it might be useful to have access to the underlying abstractions like the table object. One of those instances is if you want to be notified of events.

To listen for an event, access the special `__table__` property of your collection. e.g.,

```js
db.people.__table__.addListener('save', table => {
  console.log(`Table ${table.tableName} persisted to disk.`)
})
```

### Table events

| Event name | Description                           |
| ---------- | ------------------------------------- |
| save       | The table has been persisted to disk. |

## Performance characteristics

Once again, keep in mind that WhatDB is __for small data sets__ and favours ease-of-use and data safety above all else. That said, here are priliminary performance stats on my development machine (Intel i7-8550U (8) @ 4.000GHz, 16GB RAM).

With `examples/performance` run to generate 100,000 records, taking up ~18MB on disk, with records similar to:

```json
[
  {
    "id": "b01b0c58-7b38-49f7-b2a1-06245525df57",
    "domain": "coremax.me",
    "email": "stephen.brandt@coremax.me",
    "stripeId": "ff1a984b-a3a3-4332-9fc4-4f8315e8f6b7"
  }
]
```

(All data randomly generated.)

We currently get performance in the ballpark of:

### Reads

  - 0.00055ms (Node.js native reads clock at ~0.00005ms)

### Writes

  - Serialisation (synchronous): 240.319 ms
  - Persisting to disk (asynchronous): 50-140ms

## Memory Usage

The reason WhatDB is fast is because it keeps the whole database in memory. Also, to provide a transparent persistence and query API, it maintains a parallel object structure of proxies. This means that the amount of memory used will be multiples of the size of your database on disk.

For example, using the simple performance example above, we clock:

| Number of records | Table size on disk | Memory used |
| ----------------- | ------------------ | ----------- |
| 1,000             | 183K               | 6.62MB      |
| 10,000            | 1.8MB              | 15.67MB     |
| 100,000           | 18MB               | 74.50MB     |

## Developing

Please open an issue before starting to work on pull requests.

1. Clone this repository.
2. `npm i`
3. `npm test`

For code coverage, run `npm run coverage`.

## Related projects, inspiration, etc.

  - [proxy-fun](https://github.com/mikaelbr/awesome-es2015-proxy)
  - [filejson](https://github.com/bchr02/filejson)
  - [Declaraoids](https://github.com/Matsemann/Declaraoids/blob/master/src/declaraoids.js)
  - [ScunMEngine](https://github.com/jlvaquero/SCUNM/blob/master/SCUNMEngine/SCUNMEngine.js)

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Copyright

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).
