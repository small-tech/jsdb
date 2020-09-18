const WhatDB = require('../..')

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
