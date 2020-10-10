////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// JSTable class.
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Each JSTable is kept in its own JavaScript Data Format (JSDF) file – a
// transaction log in JavaScript –  and auto-updates its contents on change.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fs = require('fs-extra')
const path = require('path')
const { promisify } = require('util')
const isProxy = require('util').types.isProxy
const EventEmitter = require('events')

const DataProxy = require('./DataProxy')
const { log, needsToBeProxified } = require('./Util')
const Time = require('./Time')
const { performance } = require('perf_hooks')
const { emit } = require('process')

const readlineSync = require('@jcbuisson/readlinesync')
const decache = require('decache')

class JSTable extends EventEmitter {
  #data = null
  #options = null
  #dataProxy = null
  #writeStream = null
  #isInitialising = true

  // Either loads the table at the passed table path (default) or, if
  // data is passed, creates a new table at table path, populating
  // it with the passed data.
  constructor(tablePath, data = null, options = { compactOnLoad:true, alwaysUseLineByLineLoads: false }
  ) {
    super()

    this.tablePath = tablePath
    this.tableFileName = tablePath.slice(tablePath.lastIndexOf(path.sep)+1)
    this.tableName = this.tableFileName.replace('.js', '')
    this.#data = data
    this.#options = options

    if (data === null) {
      this.load()
    } else {
      this.create()
    }

    this.#isInitialising = false

    log(`   💾    ❨JSDB❩  ═══════════════════════ Table ${this.tableName} initialised ═══════════════════════`)

    // Create the append-only write stream. We open this stream using the 'as' file system flags
    // which specify append ('a'; create if it doesn’t exist, otherwise append to end) and synchronous
    // ('s', use kernel-level synchronous mode. This does NOT mean that the calls block the event loop
    // in Node.js – they do not – it means that they ask the kernel to do a synchronous write to disk.
    // This is the equivalent of calling fsync() after every write (but without the possible race condition
    // that that entails) and it is about as safe as we can make writes for our use case without
    // diminishing returns.)
    //
    // Related information:
    //
    // - https://github.com/nodejs/node/issues/28513#issuecomment-699680062
    // - https://danluu.com/file-consistency/
    this.#writeStream = fs.createWriteStream(this.tablePath, {flags: 'as'})

    // NB. we are returning the data proxy, not an
    // instance of JSTable. Use accordingly.
    return this.#dataProxy
  }


  writeTableHeader () {
    fs.appendFileSync(this.tablePath,
      `globalThis._ = ${Array.isArray(this.#data) ? '[]' : '\{\}'};\n(function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.${this.tableName} = globalThis._ } })();\n`)
  }


  // This will result in the data proxy graph being
  // populated from the data graph and having all necessary
  // transactions for creating the data graph persisted to
  // the table file on disk.
  createTransactions () {
    this.#dataProxy = DataProxy.createDeepProxy(this, Array.isArray(this.#data) ? [] : {}, '_')
    Object.keys(this.#data).forEach(key => {
      // TODO: [performance] test – would this be faster if we used locals instead of property lookup?
      // Note: this assumes compaction only occurs at startup when writes are synchronous.
      this.#dataProxy[key] = this.#data[key]
    })
  }


  _create () {
    this.writeTableHeader()
    this.createTransactions()
  }


  create () {
    const t1 = performance.now()
    log(`   💾    ❨JSDB❩ Creating and persisting table ${this.tableName}…`)
    this._create()
    log(`   💾    ❨JSDB❩  ╰─ Created and persisted table in ${(performance.now() - t1).toFixed(3)} ms.`)
  }


  // Compaction is very similar to creation but we first backup the existing table and
  // then delete the current table and then recreate it from the data.
  compact () {
    const t1 = performance.now()
    log(`   💾    ❨JSDB❩ Compacting and persisting table ${this.tableName}…`)
    const backupFilePath = `${this.tablePath}.bak`
    fs.removeSync(backupFilePath)
    fs.moveSync(this.tablePath, backupFilePath)
    fs.removeSync(this.tablePath)
    delete this.#data.__id__  // We don’t want to set the ID twice.
    this._create()
    log(`   💾    ❨JSDB❩  ╰─ Compacted and persisted table in ${(performance.now() - t1).toFixed(3)} ms.`)
  }


  // Closes the table.
  async close () {
    log(`   💾    ❨JSDB❩  │  ╰─ Closing table ${this.tableName}…`)

    return new Promise((resolve, reject) => {
      this.#writeStream.end(() => {

        // If the table was loaded via require(), this will remove it from the
        // cache so that it is loaded fresh from disk on the next attempt.
        // (If we don’t do this, all changes since the process started would
        // be lost when the table is reloaded from cache.)
        decache(this.tablePath)

        log(`   💾    ❨JSDB❩  │      ╰─ Closed table ${this.tableName}.`)
        resolve()
      })
    })
  }


  // Deletes the table.
  async delete () {
    log(`   💾    ❨JSDB❩ Deleting table ${this.tableName}…`)
    await this.close()
    await fs.remove(this.tablePath)
    log(`   💾    ❨JSDB❩  ╰─ Table in ${this.tableName} deleted.`)
    this.emit('delete', this.#dataProxy)
  }


  // Loads the table.
  load () {
    Time.mark()
    log(`   💾    ❨JSDB❩ Loading table ${this.tableName}…`)

    // Empirically, I’ve found that the performance of require() and
    // the synchronous line-by-line read and eval we’re using are
    // about equivalent at around a table size of 63MB on disk.
    // (I’ve only tested with a single record size of ~2KB using
    // the Faker module’s createCard() method so this may vary for
    // other database structures.) Below this limit, require() is
    // increasingly faster as you approach zero and the synchronous
    // line-by-line read and eval is increasingly faster from
    // there on (at around the 200MB mark, about twice as fast).
    // Also, note that after the 1GB string size limit the latter
    // method is the only viable one.
    const REQUIRE_PERFORMANCE_ADVANTAGE_SIZE_LIMIT = 64_512_000 // ~63MB.

    const tableSize = fs.statSync(this.tablePath).size

    if (tableSize < REQUIRE_PERFORMANCE_ADVANTAGE_SIZE_LIMIT && !this.#options.alwaysUseLineByLineLoads) {
      //
      // Faster to load as a module using require().
      //
      log(`   💾    ❨JSDB❩  ╰─ Loading table synchronously.`)
      this.#data = require(path.resolve(this.tablePath))
    } else {
      //
      // Faster to load line-by-line and eval.
      //
      log(`   💾    ❨JSDB❩  ╰─ Streaming table load for large table.`)
      const lines = readlineSync(this.tablePath)

      //
      // Since we’re running under Node, the UMD-style (https://github.com/umdjs/umd)
      // IIFE (https://developer.mozilla.org/en-US/docs/Glossary/IIFE)) will execute a module.exports statement.
      // Which is not what we want here. So we handle the header manually.
      //
      eval(lines.next().value) // Create the correct root object of the object graph and assign it to const _.
      lines.next()             // Skip the require() statement in the header.

      // Load in the rest of the data.
      for (let line of lines) {
        eval(line)
      }

      this.#data = _
    }
    log(`   💾    ❨JSDB❩  ╰─ Table loaded in ${Time.elapsed()} ms.`)
    if (this.#options.compactOnLoad) {
      // Compaction recreates the transaction log using the loaded-in object graph
      // so that value updates, deletes, etc., are removed and only data append
      // operations remain.
      //
      // Compaction has important privacy implications as it removes old (updated/deleted) data.
      //
      // Conversely, if keeping the history of transactions is important for you
      // (e.g., you want to play back a drawing you recorded brush-stroke by brush-stroke,
      // you may want to manually turn compaction off.)
      //
      // It will, of course, also have an effect on the file size of the table on disk.
      this.compact()
    } else {
      this.#dataProxy = DataProxy.createDeepProxy(this, this.#data, '_')
      log(`   💾    ❨JSDB❩  ╰─ Proxy generated in ${Time.elapsed()} ms.`)
    }
  }


  persistChange (change) {
    // console.log('Persisting change: ', change)
    Time.mark()
    if (!this.#isInitialising) {
      // All after initialisation are asynchronous to the write stream.
      this.#writeStream.write(change, () => {
        log(`   💾    ❨JSDB❩  Write took ${Time.elapsed()}`)
        this.emit('persist', this, change)
      })
    } else {
      // Everything during initialisation is synchronous, including the writes.
      fs.appendFileSync(this.tablePath, change, {flag: 'as'})
      // log(`   💾    ❨JSDB❩  │ ╰─ Synchronous write took ${Time.elapsed()}`)
    }
  }

}

module.exports = JSTable
