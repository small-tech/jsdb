const WhatDB = require('../..')

const db = new WhatDB('db')

// console.log('===>', db.people.where('name').is('Aral')[0].pet='Oskar')

const peopleYoungerThan35 = db.people.where('age').isLessThan(35).get()

console.log('people under 35 result set', peopleYoungerThan35)

console.log('Adding object to result set (should not be persisted)')

peopleYoungerThan35.push({name: 'baby', age: 1})

console.log('people under 35 result set', peopleYoungerThan35)

console.log('db.people', db.people)

console.log('referencing first record from results', peopleYoungerThan35[0])

console.log('updating first record (should trigger save)')
peopleYoungerThan35[0].name = 'Laura Kalbag'

console.log('db.people', db.people)
