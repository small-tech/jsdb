const JSDF = require('../../lib/JSDF')
const faker = require('faker')

const card = faker.helpers.createCard()

console.log(card)

console.time('serialisation')
const serialisedCard = JSDF.serialise(card, '_')
console.timeLog('serialisation')
console.log(serialisedCard)

////////////////////////////////////////////////////////////

// Custom object.

class Person {
  constructor (name = 'Jane Doe') {
    this.name = name
  }
  introduceYourself () {
    console.log(`Hello, I’m ${this.name}.`)
  }
}

// Initialise the people table if it doesn’t already exist.
const people = [
  new Person('Aral'),
  new Person('Laura')
]

console.time('serialise custom objects')
const serialisedPeople = JSDF.serialise(people, 'folks')
console.timeLog('serialise custom objects')

console.log(serialisedPeople)

eval(serialisedPeople)

folks[1].introduceYourself()

// Should throw:
// Error: You cannot store objects of type Function in JSDB.
const naughty = [
  function () { console.log('Do evil stuff!!!')}
]

JSDF.serialise(naughty, 'naughty')
