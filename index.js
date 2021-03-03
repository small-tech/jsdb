////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// JavaScript Database (JSDB)
// ══════════════════════════
//
// Copyright ⓒ 2020-2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// To use:
//
// // Create or load in a database:
// const db = new JSDB(databaseDirectory)
//
// // Initialise some tables (either JavaScript arrays or objects).
// db.table1 = [ {x: 1, y:3}, {x: 10, y: 42}, {x: 0, y: 0} ]
// db.table2 = { darkMode: true, fontSize: 16 }
//
// // You should give your tables meaningful names and, for the most part,
// // just think of them as regular JavaScript objects.
// //
// // (Also, you can store custom objects in them).
//
// db.people = [ new Person('Aral'), new Person('Laura')]
//
// // Query your data using JSQL.
// db.people.where('name').is('Laura').getFirst()
//
// For more usage information or to open an issue, etc., please see:
// https://github.com/small-tech/jsdb
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export { default } from './lib/JSDB.js'
