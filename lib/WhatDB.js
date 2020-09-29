////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// WhatDB class.
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// To use:
//
// const db = new WhatDB(databaseDirectory)
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fs = require('fs-extra')
const path = require('path')
const { log } = require('./Util')

const WhatTable = require('./WhatTable')

class WhatDB {
  constructor (basePath, deleteIfExists = false) {
    this.basePath = basePath

    this.dataProxy = new Proxy({}, this.proxyHandler)

    if (deleteIfExists) {
      log(`   💾    ❨JSDB❩ Fresh database requested at ${basePath}; existing database is being deleted.`)
      fs.removeSync(basePath)
    }

    if (fs.existsSync(basePath)) {
      // Load any existing data there might be.
      this.loadTables()
    } else {
      log(`   💾    ❨JSDB❩ No database found at ${basePath}; creating it.`)
      fs.mkdirpSync(basePath)
    }

    // NB. we are returning the data proxy, not an
    // instance of WhatDB. Use accordingly.
    return this.dataProxy
  }

  loadTables () {
    this.loadingTables = true
    let tableFiles
    tableFiles = fs.readdirSync(this.basePath)
    tableFiles.filter(fileName => fileName.endsWith('.js')).forEach(tableFile => {
      const tableName = tableFile.replace('.js', '')
      const tablePath = path.join(this.basePath, tableFile)
      const table = new WhatTable(tablePath)
      this.dataProxy[tableName] = table
    })
    this.loadingTables = false
  }

  get proxyHandler () {
    return {
      set: this.setHandler.bind(this)
    }
  }

  setHandler (target, property, value, receiver) {
    //
    // Only objects (including custom objects) and arrays are allowed at
    // the root level. Each object/array in the root is considered a separate table
    // (instance of WhatTable) and is kept in its own JSON file. For a good reference
    // on data types supported by JSON.stringify, see:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
    //
    const typeOfValue = typeof value
    if (value === undefined || value === null) {
      throw new TypeError(`You cannot create a table by setting a${value === undefined ? 'n': ''} ${value} value.`)
    }
    ['function', 'symbol', 'string', 'number', 'bigint'].forEach(forbiddenType => {
      if (typeof value === forbiddenType) {
        throw new TypeError(`You cannot create a table by setting a value of type ${forbiddenType} (${value}).`)
      }
    })

    // If we’re initially loading tables, do not attempt to create a new table.
    if (!this.loadingTables) {
      const tableName = `${property}.js`
      const tablePath = path.join(this.basePath, tableName)
      value = new WhatTable(tablePath, value)
    }

    Reflect.set(target, property, value, receiver)
    return true
  }
}

module.exports = WhatDB
