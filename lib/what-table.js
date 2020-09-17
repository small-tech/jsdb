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
const { log, needsToBeProxified } = require('./util')
const isProxy = require('util').types.isProxy
const { promisify } = require('util')
const Time = require('./Time')
const fastWriteAtomic = promisify(require('fast-write-atomic'))


class WhatTable {
  // Either loads the table at the passed table path (default) or, if
  // a root object is passed, creates a new table at table path, populating
  // it with the passed root object.
  constructor(tablePath, rootObject = null) {
    this.tablePath = tablePath
    this.tableFileName = tablePath.slice(tablePath.lastIndexOf(path.sep)+1)
    this.tableName = this.tableFileName.replace('.json', '')

    this.isSaving = false
    this.saveTimer = null

    const data = (rootObject === null) ? this.load() : this.create(rootObject)

    // Since table creation is not a common occurrence (it will usually happen at initial server
    // startup), we take the hit now and proxify the whole structure. From there on, we will proxify
    // on object definition/change.
    Time.mark()
    this.dataProxy = this.deepProxy(data)
    console.log(`   💾    ❨WhatDB?❩  ╰─ Proxified in ${Time.elapsed()} ms.`)

    // NB. we are returning the data proxy, not an
    // instance of WhatTable. Use accordingly.
    return this.dataProxy
  }

  deepProxy(object) {
    Object.keys(object).forEach(key => {
      const value = object[key]
      if (needsToBeProxified(value)) { object[key] = this.deepProxy(value) }
    })
    // Proxify the original object itself.
    return new Proxy(object, this.proxyHandler)
  }

  load() {
    log(`   💾    ❨WhatDB?❩ Loading table ${this.tableName}…`)
    Time.mark()
    const jsonSerialisedTable = fs.readFileSync(this.tablePath, 'utf-8')
    console.log(`   💾    ❨WhatDB?❩  ╰─ Read in ${Time.elapsed()} ms.`)
    const parsedTable = JSON.parse(jsonSerialisedTable)
    console.log(`   💾    ❨WhatDB?❩  ╰─ Parsed in ${Time.elapsed()} ms.`)
    return parsedTable
  }

  create (rootObject) {
    log(`   💾    ❨WhatDB?❩ Creating table ${this.tableName}…`)
    Time.mark()
    const tableContents = JSON.stringify(rootObject)
    log(`   💾    ❨WhatDB?❩  ╰─ Stringified in ${Time.elapsed()} ms.`)
    fs.writeFileSync(this.tablePath, tableContents)
    log(`   💾    ❨WhatDB?❩  ╰─ Wrote in ${Time.elapsed()} ms.`)
    return rootObject
  }

  get proxyHandler () {
    return {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this),
      defineProperty: this.definePropertyHandler.bind(this),
      deleteProperty: this.deletePropertyHandler.bind(this)
    }
  }

  getHandler (target, property, receiver) {
    // console.log('get', target, property, receiver)
    return Reflect.get(...arguments)
  }

  setHandler (target, property, value, receiver) {
    // log('set', target, property, value, receiver)
    if (needsToBeProxified(value)) { value = this.deepProxy(value) }
    Reflect.set(target, property, value, receiver)
    this.save()
    return true
  }

  definePropertyHandler (target, key, descriptor) {
    // console.log('defineProperty', target, key, descriptor)
    return Reflect.defineProperty(...arguments)
  }

  deletePropertyHandler (target, property) {
    // console.log('deleteProperty', target, property)
    const deleteResult = Reflect.deleteProperty(...arguments)
    if (deleteResult === true) {
      this.save()
    }
    return deleteResult
  }

  save () {
    // log(`Save called on table: ${this.tableName}.`)
    if (this.saveTimer && this.saveTimer.hasRef()) {
      // log(`Ignoring save call on same event loop cycle on table: ${this.tableName}.`)
      return
    }

    this.saveTimer = setImmediate(this.__save.bind(this))
  }

  async __save () {
    // We are in the process of saving the file so don’t try to overwrite it.
    if (this.isSaving) {
      // Ensure we keep trying.
      this.save()
      return
    }

    // OK, it’s safe to save, let’s do it!
    this.isSaving = true
    log(`   💾    ❨WhatDB?❩ Saving ${this.tableName} table…`)
    Time.mark()
    // Note: stringification is synchronous but, for our use case (the amount
    // =====  of data that will be kept on the server in Small Web sites, if
    //       any), it is entirely sufficient and doesn’t block. It also means
    //       that we do not have to otherwise lock or clone the data structure
    //       which can be updated from any number of routes at any time.
    const tableContents = JSON.stringify(this.dataProxy)
    log(`   💾    ❨WhatDB?❩  ╰─ Stringified in ${Time.elapsed()} ms.`)
    await fastWriteAtomic(this.tablePath, tableContents)
    log(`   💾    ❨WhatDB?❩  ╰─ Wrote in ${Time.elapsed()} ms.`)
    this.isSaving = false
  }
}

module.exports = WhatTable
