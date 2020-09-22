const WhatDB = require('../..')

const db = new WhatDB('db')

// console.log('===>', db.people.where('name').is('Aral')[0].pet='Oskar')

const peopleYoungerThan35 = db.people.where('age').isLessThan(35).get()

console.log(peopleYoungerThan35)
console.log(peopleYoungerThan35[0])
// peopleYoungerThan35[0].name = 'Laura Kalbag'
console.log(db.people)
