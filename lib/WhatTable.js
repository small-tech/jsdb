////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// WhatTable? class.
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Each WhatTable? is kept in its own JSON file and auto-updates its contents on change.
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
const { emit } = require('process')

const readlineSync = require('@jcbuisson/readlinesync')


class WhatTable extends EventEmitter {

  #data = null
  #dataProxy = null
  #writeStream = null
  #compactOnLoad = true
  #isInitialising = true

  // Either loads the table at the passed table path (default) or, if
  // data is passed, creates a new table at table path, populating
  // it with the passed data.
  constructor(tablePath, data = null, compactOnLoad = true) {
    super()

    this.tablePath = tablePath
    this.tableFileName = tablePath.slice(tablePath.lastIndexOf(path.sep)+1)
    this.tableName = this.tableFileName.replace('.js', '')
    this.#data = data
    this.#compactOnLoad = compactOnLoad

    if (data === null) {
      this.load()
    } else {
      this.create()
    }

    this.#isInitialising = false

    log(`   💾    ❨WhatDB?❩  ═══════════════════════ Database initialised ═══════════════════════`)

    this.createWriteStreamIfNecessary()

    // NB. we are returning the data proxy, not an
    // instance of WhatTable. Use accordingly.
    return this.#dataProxy
  }


  get dataRootObject () {
    return Array.isArray(this.#data) ? '[]' : '{}'
  }


  // Lazily create the append-only write stream. We open this stream using the 'as' file system flags
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
  //
  // Note: we do not make this a singleton-like accessor because it may be called in tight loop
  // ===== and this will slow it down with an unnecessary conditional at every execution.
  //
  createWriteStreamIfNecessary () {
    if (this.#writeStream === null) {
      this.#writeStream = fs.createWriteStream(this.tablePath, {flags: 'as'})
    }
    return this.#writeStream
  }


  writeTableHeader () {
    fs.appendFileSync(this.tablePath,
      `const _ = ${Array.isArray(this.#data) ? '[]' : '\{\}'}\n_.__id__ = '_'\nmodule.exports = _\n`)
  }

  // This will result in the data proxy graph being
  // populated from the data graph and having all necessary
  // transactions for creating the data graph persisted to
  // the table file on disk.
  createTransactions () {
    this.#dataProxy = DataProxy.createDeepProxy(this, Array.isArray(this.#data) ? [] : {}, '_')
    Object.keys(this.#data).forEach(key => {
      // TODO: [performance] test – would this be faster if we used locals instead of property lookup?
      // TODO: How do we know when all these writes have persisted?
      this.#dataProxy[key] = this.#data[key]
    })
  }


  _create () {
    // this.createWriteStreamIfNecessary()
    this.writeTableHeader()
    this.createTransactions()
  }


  create () {
    Time.mark()
    log(`   💾    ❨WhatDB?❩ Creating and persisting table ${this.tableName}…`)
    this._create()
    log(`   💾    ❨WhatDB?❩  ╰─ Created and persisted table in ${Time.elapsed()} ms.`)
  }


  // Compaction is very similar to creation but we first backup the existing table and
  // then delete the current table and then recreate it from the data.
  compact () {
    Time.mark()
    log(`   💾    ❨WhatDB?❩ Compacting and persisting table ${this.tableName}…`)
    const backupFilePath = `${this.tablePath}.bak`
    fs.removeSync(backupFilePath)
    fs.moveSync(this.tablePath, backupFilePath)
    fs.removeSync(this.tablePath)
    delete this.#data.__id__  // We don’t want to set the ID twice.
    this._create()
    log(`   💾    ❨WhatDB?❩  ╰─ Compacted and persisted table in ${Time.elapsed()} ms.`)
  }


  load () {
    Time.mark()
    log(`   💾    ❨WhatDB?❩ Loading table ${this.tableName}…`)

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

    if (tableSize < REQUIRE_PERFORMANCE_ADVANTAGE_SIZE_LIMIT) {
      //
      // Faster to load as a module using require().
      //
      log(`   💾    ❨WhatDB?❩  ╰─ Loading table synchronously.`)
      this.#data = require(path.resolve(this.tablePath))
    } else {
      //
      // Faster to load line-by-line and eval.
      //
      log(`   💾    ❨WhatDB?❩  ╰─ Streaming table load for large table.`)
      const lines = readlineSync(this.tablePath)
      for (let line of lines) {
        eval(line)
      }
      this.#data = _
    }
    log(`   💾    ❨WhatDB?❩  ╰─ Table loaded in ${Time.elapsed()} ms.`)
    if (this.#compactOnLoad) {
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
      // this.createWriteStreamIfNecessary()
      this.#dataProxy = DataProxy.createDeepProxy(this, this.#data, '_')
      log(`   💾    ❨WhatDB?❩  ╰─ Proxy generated in ${Time.elapsed()} ms.`)
    }
  }


  persistChange (change) {
    // console.log('Persisting change: ', change)
    Time.mark()
    if (!this.#isInitialising) {
      this.#writeStream.write(change, () => {
        log(`   💾    ❨WhatDB?❩  Write took ${Time.elapsed()}`)
        this.emit('persist', this, change)
      })
    } else {
      // Everything during initialisation is synchronous, including the writes.
      fs.appendFileSync(this.tablePath, change, {flag: 'as'})
      log(`   💾    ❨WhatDB?❩  ╰─ Synchronous write took ${Time.elapsed()}`)
    }
  }
}

module.exports = WhatTable
