////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// JSDB class.
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// To use:
//
// const db = new JSDB(databaseDirectory)
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fs = require('fs-extra')
const path = require('path')
const { log } = require('./Util')
const asyncForEach = require('./async-foreach')

const { isProxy } = require('util').types

const JSTable = require('./JSTable')

class JSDB {

  //
  // Class.
  //

  static openDatabases = {}

  // Returns a reference to the JSDB at the given basepath. If it’s already open,
  // returns the reference.
  static open (basePath, options) {
    basePath = path.resolve(basePath)
    if (this.openDatabases[basePath] == undefined) {
      this.openDatabases[basePath] = new this(basePath, options)
    }
    return this.openDatabases[basePath]
  }


  static close (basePath) {
    this.openDatabases[basePath] = null
  }

  //
  // Instance.
  //

  #tableDataProxies = []

  constructor (basePath, options = {
    deleteIfExists: false
  }) {
    this.basePath = basePath
    this.options = options

    this.dataProxy = new Proxy({}, this.proxyHandler)

    if (options.deleteIfExists) {
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
    // instance of JSDB. Use accordingly.
    return this.dataProxy
  }


  loadTables () {
    this.loadingTables = true
    let tableFiles
    tableFiles = fs.readdirSync(this.basePath)
    tableFiles.filter(fileName => fileName.endsWith('.js')).forEach(tableFile => {
      const tableName = tableFile.replace('.js', '')
      const tablePath = path.join(this.basePath, tableFile)
      const table = new JSTable(tablePath)
      this.dataProxy[tableName] = table
      this.#tableDataProxies.push(table)
    })
    this.loadingTables = false
  }

  get proxyHandler () {
    return {
      set: this.setHandler.bind(this),
      get: this.getHandler.bind(this)
    }
  }

  getHandler (target, property, receiver) {
    // To close the database, we wait for all the tables to be closed and then remove the
    // database’s path from the list of open databases so that it can be opened again in
    // the future. Note that this is a trap on the returned dataProxy. Should we make it a
    // class method and expose it via a __database__ trap instead for consistency with JSTable
    // and its __table__ property? (Probably, yes.) TODO []
    if (property === 'close') {
      return async function () {
        log(`   💾    ❨JSDB❩ Closing database at ${this.basePath}…`)
        await asyncForEach(this.#tableDataProxies, async tableDataProxy => {
          await tableDataProxy.__table__.close()
        })
        JSDB.close(this.basePath)
        log(`   💾    ❨JSDB❩  ╰─ Closed database at ${this.basePath}.`)
      }.bind(this)
    }
    return Reflect.get(...arguments)
  }

  setHandler (target, property, value, receiver) {
    //
    // Only objects (including custom objects) and arrays are allowed at
    // the root level. Each object/array in the root is considered a separate table
    // (instance of JSTable) and is kept in its own JSON file. For a good reference
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
      value = new JSTable(tablePath, value)
      this.#tableDataProxies.push(value)
    }

    Reflect.set(target, property, value, receiver)
    return true
  }
}

module.exports = JSDB
