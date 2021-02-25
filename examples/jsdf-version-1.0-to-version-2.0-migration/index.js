//
// Convert from JSDF 1.0 to JSDF 2.0
//

import fs from 'fs'

// Load in the version 1.0 table.
const tableVersion1 = fs.readFileSync('./db-version-1.0/people.js', 'utf-8')

// Split the string into an array of lines for convenience.
//
// Note: for much larger tables, you will want to use a module like
// node-readlines to read individual lines from your tables.
// See the load() method in lib/JSTable.js for an example of the
// approach you would take.
const tableLines = tableVersion1.split('\n')

// 1. Update the first line.
tableLines[0] = tableLines[0].replace('globalThis._', 'export const _')

// 2. Remove the second line.
tableLines.splice(1,1)

// Rejoin the array into a string.
const tableVersion2 = tableLines.join('\n')

// Write out the version 2.0 table.
if (!fs.existsSync('db')) {
  fs.mkdirSync('db')
}
fs.writeFileSync('db/people.js', tableVersion2)
