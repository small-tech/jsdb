import JSDB from '../../index.js'

// Create your database in the test folder.
// (This is where your JSON files – “tables” – will be saved.)
const db = await JSDB.open('db')

// Create test/people.json with some data.
if (!db.people) {
  db.people = [
    {name: 'Aral', age: 43},
    {name: 'Laura', age: 34}
  ]

  console.log('>>>', db)

  // Correct Laura’s age. (This will automatically update db/people.js)
  db.people[1].age = 33

  // Add Oskar to the family. (This will automatically update db/people.js)
  db.people.push({name: 'Oskar', age: 8})

  // Update Oskar’s name to use his nickname. (This will automatically update db/people.js)
  db.people[2].name = 'Osky'
}
