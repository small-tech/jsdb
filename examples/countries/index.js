const fs = require('fs')
const JSDB = require('../..')


// console.log(languages)

const db = new JSDB('db')

// If the data has not been populated yet, populate it.
if (db.countries === undefined) {
  const countries = JSON.parse(fs.readFileSync('./countries.json', 'utf-8'))
  db.countries = countries
}

// Query the data.

console.log(db.countries)

const countriesThatSpeakEnglish = db.countries.where('languages').includes('English').get()

console.log(countriesThatSpeakEnglish)
