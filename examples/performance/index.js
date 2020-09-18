const WhatDB = require('../..')
const dummyJSON = require('dummy-json')
const { performance } = require('perf_hooks')
const process = require('process')

const fs = require('fs-extra')
const path = require('path')

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

  const dummyDataTemplate = `
  [
    {{#repeat ${1000}}}
    {
      "id": "{{guid}}",
      "domain": "{{domain}}",
      "email": "{{email}}",
      "stripeId": "{{guid}}"
    }
    {{/repeat}}
  ]
  `

  s = performance.now()
  // Create only a 1,000 unique items and repeat them as generating new items is slow
  // and fizzles out before 100,000 with the module we’re using.
  const aThousandUniqueRecords = dummyJSON.parse(dummyDataTemplate)
  let data = []
  for (let j = 0; j < numberOfRecordsToGenerate/1000; j++) {
    data = data.concat(JSON.parse(aThousandUniqueRecords))
  }
  e = performance.now()
  console.log(`Dummy data generation took ${e-s} ms for ${numberOfRecordsToGenerate} records.`)

  console.log(`Ensuring database does not exist.`)
  fs.removeSync(path.resolve('./db'))

  db = new WhatDB('db')

  s = performance.now()
  db.accounts = data
  e = performance.now()
  console.log(`Database initialisation took ${e-s} ms for ${numberOfRecordsToGenerate} records.`)
} else {
  db = new WhatDB('db')
}

console.log('\n=== Testing property change. ===\n')

s = performance.now()
  db.accounts[db.accounts.length/2].domain = 'laurakalbag.com'
e = performance.now()
console.log(`Updating a single field in ${db.accounts.length} records took ${e-s} ms.`)

console.log('1 >>>', db.accounts[db.accounts.length/2].domain)

setTimeout(() => {
  console.log('<<<<< UPDATING THE DATABASE AGAIN, DURING A WRITE :) >>>>>>')
  s = performance.now()
  db.accounts[db.accounts.length/2].domain = 'ar.al'
  e = performance.now()
  console.log(`Updating a field took ${e-s} ms for ${db.accounts.length} records.`)
  console.log('2 >>>', db.accounts[db.accounts.length/2].domain)
}, 100)

const used = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
