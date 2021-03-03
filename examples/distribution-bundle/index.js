import JSDB from '../../dist/index.js'

const db = JSDB.open('db')

if (!db.jsdfVersions) {
  db.jsdfVersions = {
    1: 'CommonJS/UMD',
    2: 'ECMAScript Modules (ESM; es6 modules)'
  }
}

for (let version in db.jsdfVersions) {
  console.log(`JSDF version ${version}.0 uses ${db.jsdfVersions[version]}.`)
}
