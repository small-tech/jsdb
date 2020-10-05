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

  static #isBeingInstantiatedByFactoryMethod = false
  static #openDatabases = {}

  //
  // Public.
  //

  // Returns a reference to the JSDB at the given basepath. If it’s already open,
  // returns the reference.
  static open (basePath, options) {
    basePath = path.resolve(basePath)
    if (this.#openDatabases[basePath] == undefined) {
      this.#isBeingInstantiatedByFactoryMethod = true
      this.#openDatabases[basePath] = new this(basePath, options)
      this.#isBeingInstantiatedByFactoryMethod = false
    }
    return this.#openDatabases[basePath]
  }

  //
  // Private.
  //

  //
  // Instance.
  //

  #tableDataProxies = []  // TODO: Do we really need this as we’re doing this.dataProxy[tableName] = tableDataProxy ?
  #tableNames = []


  constructor (basePath, options = {
    deleteIfExists: false
  }) {
    // This class can only be instantiated via the open() factory method.
    // This is to ensure that multiple instances of the same database cannot be opened at the
    // same time, thereby leading to data corruption.
    if (!JSDB.#isBeingInstantiatedByFactoryMethod) {
      throw new Error('The JSDB class cannot be directly instantiated. Please use the JSDB.open() factory method instead.')
    }

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


  onTableDelete (tableDataProxy) {
    log(`   💾    ❨JSDB❩ Removing table ${tableDataProxy.__table__.tableName} from database…`)
    this.#tableDataProxies = this.#tableDataProxies.filter(dataProxy => dataProxy !== tableDataProxy)
    this.#tableNames = this.#tableNames.filter(tableName => tableName !== tableDataProxy.__table__.tableName)
    tableDataProxy.__table__.removeListener('delete', this.onTableDelete.bind(this))
    log(`   💾    ❨JSDB❩  ╰─ Table in ${tableDataProxy.__table__.tableName} removed from database.`)
  }


  loadTables () {
    this.loadingTables = true
    let tableFiles
    tableFiles = fs.readdirSync(this.basePath)
    tableFiles.filter(fileName => fileName.endsWith('.js')).forEach(tableFile => {
      const tableName = tableFile.replace('.js', '')
      const tablePath = path.join(this.basePath, tableFile)
      const tableDataProxy = new JSTable(tablePath)
      tableDataProxy.__table__.addListener('delete', this.onTableDelete.bind(this))
      this.dataProxy[tableName] = tableDataProxy
      this.#tableNames.push(tableName)
      this.#tableDataProxies.push(tableDataProxy)
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
        JSDB.#openDatabases[this.basePath] = null
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

      if (this.#tableNames.includes(property)) {
        // Table already exists. You cannot replace it by setting a new value
        // as this is a synchronous operation that involves closing the current
        // writeStream, deleting the table, and creating a new table. To replace a table,
        // you must first call the asynchronous db.tableName.__table__delete() method.
        // return false
        throw new Error(`Table ${property} already exists. To replace it, please first call await <database>.${property}.__table__.delete().`)
      }

      const tableFileName = `${property}.js`
      const tablePath = path.join(this.basePath, tableFileName)
      value = new JSTable(tablePath, value)
      value.__table__.addListener('delete', this.onTableDelete.bind(this))
      this.#tableDataProxies.push(value)
      this.#tableNames.push(property)
    }

    Reflect.set(target, property, value, receiver)
    return true
  }
}

module.exports = JSDB
