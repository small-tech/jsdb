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

const fastWriteAtomic = promisify(require('fast-write-atomic'))

// const JSONStream = require('JSONStream')

const JsonStreamStringify = require('json-stream-stringify');

const DataProxy = require('./DataProxy')
const { log, needsToBeProxified } = require('./Util')
const Time = require('./Time')
const { emit } = require('process')


class WhatTable extends EventEmitter {

  // Either loads the table at the passed table path (default) or, if
  // a root object is passed, creates a new table at table path, populating
  // it with the passed root object.
  constructor(tablePath, rootObject = null) {
    super()

    this.tablePath = tablePath
    this.tableFileName = tablePath.slice(tablePath.lastIndexOf(path.sep)+1)
    this.tableName = this.tableFileName.replace('.json', '')

    this.isSaving = false
    this.saveTimer = null

    // We keep the original data separate so we can use it (instead of the
    // proxy) for expensive operations like serialisaton.
    this.data = (rootObject === null) ? this.load() : this.create(rootObject)
    Time.mark()
    const dataProxy = DataProxy.createDeepProxy(this, this.data)
    log(`   💾    ❨WhatDB?❩  ╰─ Proxified in ${Time.elapsed()} ms.`)

    // NB. we are returning the data proxy, not an
    // instance of WhatTable. Use accordingly.
    return dataProxy
  }


  load() {
    log(`   💾    ❨WhatDB?❩ Loading table ${this.tableName}…`)
    Time.mark()
    const jsonSerialisedTable = fs.readFileSync(this.tablePath, 'utf-8')
    log(`   💾    ❨WhatDB?❩  ╰─ Read in ${Time.elapsed()} ms.`)
    const parsedTable = JSON.parse(jsonSerialisedTable)
    log(`   💾    ❨WhatDB?❩  ╰─ Parsed in ${Time.elapsed()} ms.`)
    return parsedTable
  }


  create (rootObject) {
    log(`   💾    ❨WhatDB?❩ Creating table ${this.tableName}…`)
    Time.mark()
    const tableContents = JSON.stringify(rootObject, null, 2)
    log(`   💾    ❨WhatDB?❩  ╰─ Serialised in ${Time.elapsed()} ms.`)
    fs.writeFileSync(this.tablePath, tableContents)
    log(`   💾    ❨WhatDB?❩  ╰─ Persisted in ${Time.elapsed()} ms.`)
    return rootObject
  }


  save () {
    if (this.saveTimer !== null && this.saveTimer.hasRef()) {
      // Save has already been called in this stack frame. Ignore the call.
      return
    }

    // Attempt to trigger a write to disk on the next stack frame.
    this.saveTimer = setImmediate(this.__save.bind(this))
  }


  async __save () {
    // Ensure that only a single write is in progress at any one time.
    if (this.isSaving) {
      // Ensure we keep trying.
      this.save()
      return
    }

    // OK, it’s safe to write the table to disk; let’s do it!
    this.isSaving = true
    log(`   💾    ❨WhatDB?❩ Saving ${this.tableName} table…`)
    Time.mark()

    await new Promise((resolve, reject) => {

      let tableContents = ''
      const jsonStream = new JsonStreamStringify(this.data, undefined, 2)
      jsonStream.on('data', data => {
        tableContents += data.toString()
      })
      jsonStream.once('end', async() => {
        log(`   💾    ❨WhatDB?❩  ╰─ Serialised in ${Time.elapsed()} ms.`)
        await fastWriteAtomic(this.tablePath, tableContents)
        log(`   💾    ❨WhatDB?❩  ╰─ Persisted in ${Time.elapsed()} ms.`)
        resolve()
      })
    })

    this.isSaving = false
    this.emit('save', this)
  }
}

module.exports = WhatTable

