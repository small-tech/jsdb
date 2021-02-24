// Run this after running index.js to see
// the behaviour when the Person class doesn’t exist.
import JSDB from '../../index.js'

const db = JSDB.open('db')
console.log(db.people[1])
