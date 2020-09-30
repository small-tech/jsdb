const JSDB = require('../..')
const { performance } = require('perf_hooks')
const process = require('process')
const Time = require('../../lib/Time')

const fs = require('fs-extra')
const path = require('path')
const faker = require('faker')

let generate = false
let numberOfRecordsToGenerate = 10000

if (process.argv.length > 2) {
  if (process.argv[2] === 'generate') {
    generate = true
    if (process.argv.length > 3) {
      numberOfRecordsToGenerate = parseInt(process.argv[3])
    }
  }
}

let db = null

if (generate) {
  console.log(`Generating ${numberOfRecordsToGenerate} dummy records. Please wait…`)

  s = performance.now()
  const data = []
  for (let i = 0; i < numberOfRecordsToGenerate; i++) {
    data.push(faker.helpers.createCard())
  }
  e = performance.now()
  console.log(`Dummy data generation took ${e-s} ms for ${numberOfRecordsToGenerate} records.`)

  db = new JSDB('db', { deleteIfExists: true })

  s = performance.now()
  db.accounts = data
  e = performance.now()
  console.log(`Database initialisation took ${e-s} ms for ${numberOfRecordsToGenerate} records.`)
} else {
  db = new JSDB('db')
}

console.log('\n=== Testing property access. ===\n')

const timings = []
for (let i = 0; i < db.accounts.length; i++) {
  Time.mark()
  db.accounts[i]
  timings.push(Time.elapsed(-1))
}
console.log(`Gets took on average (${db.accounts.length} tries): ${(timings.reduce((p, c) => p + c, 0)/db.accounts.length).toFixed(5)}`)

console.log(`The name on account #${db.accounts.length/2} is: ${db.accounts[db.accounts.length/2].name}`)

console.log('\n=== Testing property change. ===\n')

s = performance.now()
db.accounts[db.accounts.length/2].name = 'Laura Kalbag'
e = performance.now()
console.log(`Updating a single field in ${db.accounts.length} records took ${e-s} ms.`)

console.log('Updating table again, immediately.')
s = performance.now()
db.accounts[db.accounts.length/2].name = 'Aral Balkan'
e = performance.now()
console.log(`Updating table again took ${e-s} ms for ${db.accounts.length} records.`)

const used = process.memoryUsage().heapUsed / 1024 / 1024;

console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
