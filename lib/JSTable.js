////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// JSTable class.
//
// Copyright ⓒ 2020-2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Each JSTable is kept in its own JavaScript Data Format (JSDF) file – an append-only
// transaction log in JavaScript –  and auto-updates its contents as its representation in memory changes.
//
// NOTE that the constructor returns a promise that resolves to the data proxy.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import fs from 'fs-extra'
import path from 'path'
import EventEmitter from 'events'

import DataProxy from './DataProxy.js'
import JSDF from './JSDF.js'

import { log } from './Util.js'
import Time from './Time.js'
import { performance } from 'perf_hooks'

// import readlineSync from '@jcbuisson/readlinesync'

export default class JSTable extends EventEmitter {
  data = null
  options = null
  dataProxy = null
  writeStream = null

  // Note: this internal property can be used to keep track of writes
  // ===== to log them for debugging purposes. Since this is a performance drain
  //       (and since even a conditional would be performance drain here), it,
  //       along with the code in the persistChange() method is commented out.
  //       Do not remove this as it would be a pain to have to rewrite it every
  //       time we need to debug it.
  // numberOfWrites = 0

  // Note:
  constructor(tablePath, data = null, options = { compactOnLoad:true, alwaysUseLineByLineLoads: false }
  ) {
    super()

    this.tablePath = tablePath
    this.tableFileName = tablePath.slice(tablePath.lastIndexOf(path.sep)+1)
    this.tableName = this.tableFileName.replace('.js', '')
    this.data = data
    this.options = options

    return new Promise (async (resolve, reject) => {
      if (data === null) {
        // Loads most likely using dynamic imports and are thus asynchronous.
        await this.load()
      } else {
        this.create()
      }

      log(`   💾    ❨JSDB❩ Table ${this.tableName} initialised.`)

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
      // - https://github.com/nodejs/node/issues/28513issuecomment-699680062
      // - https://danluu.com/file-consistency/
      this.writeStream = fs.createWriteStream(this.tablePath, {flags: 'as'})

      // NB. we are returning the data proxy, not an
      // instance of JSTable. Use accordingly.
      resolve(this.dataProxy)
    })
  }


  _create (tablePath = null) {
    const serialisedData = JSDF.serialise(this.data, 'export default', null)
    this.dataProxy = DataProxy.createDeepProxy(this, this.data, '_')
    fs.appendFileSync(tablePath || this.tablePath,serialisedData)
  }


  create () {
    const t1 = performance.now()
    log(`   💾    ❨JSDB❩ Creating and persisting table ${this.tableName}…`)
    this._create()
    log(`   💾    ❨JSDB❩  ╰─ Created and persisted table in ${(performance.now() - t1).toFixed(3)} ms.`)
  }


  // Compaction is very similar to creation but we create a temporary compacted file and then
  // atomically rename it to the name of our table, thereby replacing it with the compacted file.
  compact () {
    const t1 = performance.now()
    log(`   💾    ❨JSDB❩ Compacting and persisting table ${this.tableName}…`)
    const compactedFilePath = `${this.tablePath}.compacted.tmp`
    fs.removeSync(compactedFilePath)
    delete this.data.__id__  // We don’t want to set the ID twice as the creation process will.
    this._create(compactedFilePath)
    fs.moveSync(compactedFilePath, this.tablePath, { overwrite: true })
    log(`   💾    ❨JSDB❩  ╰─ Compacted and persisted table in ${(performance.now() - t1).toFixed(3)} ms.`)
  }


  // Closes the table.
  async close () {
    log(`   💾    ❨JSDB❩  │  ╰─ Closing table ${this.tableName}…`)

    return new Promise((resolve, reject) => {
      this.writeStream.end(() => {
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
    this.emit('delete', this.dataProxy)
  }


  // Loads the table.
  async load () {
    const tableTimingLabel = `table-${this.tableName}-load`
    Time.mark(tableTimingLabel)
    log(`   💾    ❨JSDB❩ Loading table ${this.tableName}…`)

    const LOAD_STRATEGY_CHANGE_LIMIT = 500_000_000 // bytes.

    const tableSize = fs.statSync(this.tablePath).size

    // if (tableSize < LOAD_STRATEGY_CHANGE_LIMIT && !this.options.alwaysUseLineByLineLoads) {
      //
      // Regular load, use require().
      //
      log(`   💾    ❨JSDB❩  ╰─ Loading table synchronously.`)

      const cacheBustingTablePath = `${path.resolve(this.tablePath)}?update=${Date.now()}`
      this.data = await import(cacheBustingTablePath)
    // } else {
    //   //
    //   // Large table load strategy.
    //   // (Note that Node.js has a 1GB hard limit on string size so no transaction in the
    //   // table can be bigger than this or Node will crash. This should never be a problem.)
    //   //
    //   log(`   💾    ❨JSDB❩  ╰─ Streaming table load for large table (> 500MB).`)
    //   this.options.compactOnLoad = false
    //   log(`   💾    ❨JSDB❩  ╰─ Note: compaction is disabled for large tables (> 500MB) for performance reasons.`)
    //   const lines = readlineSync(this.tablePath)

    //   //
    //   // Since we’re running under Node, the UMD-style (https://github.com/umdjs/umd)
    //   // IIFE (https://developer.mozilla.org/en-US/docs/Glossary/IIFE)) will execute a module.exports statement.
    //   // Which is not what we want here. So we handle the header manually.
    //   //
    //   eval(lines.next().value) // Create the correct root object of the object graph and assign it to const _.
    //   lines.next()             // Skip the require() statement in the header.

    //   // Load in the rest of the data.
    //   for (let line of lines) {
    //     eval(line)
    //   }

    //   this.data = _
    // }
    log(`   💾    ❨JSDB❩  ╰─ Table loaded in ${Time.elapsed(tableTimingLabel)} ms.`)
    if (this.options.compactOnLoad) {
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
      log(`   💾    ❨JSDB❩  ╰─ Privacy warning: compaction is disabled. Deleted/updated data will remain on disk.`)
      this.dataProxy = DataProxy.createDeepProxy(this, this.data, '_')
      log(`   💾    ❨JSDB❩  ╰─ Proxy generated in ${Time.elapsed(tableTimingLabel)} ms.`)
    }
  }


  persistChange (change) {
    // const writeTimingLabel = ++this.numberOfWrites
    // Time.mark(writeTimingLabel)
    this.writeStream.write(change, () => {
      // log(`   💾    ❨JSDB❩  Write ${writeTimingLabel} took ${Time.elapsed(writeTimingLabel)}`)
      this.emit('persist', this, change)
    })
  }

}
