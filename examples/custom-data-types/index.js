import JSDB from '../../index.js'

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
