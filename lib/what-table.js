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

const { performance } = require('perf_hooks')


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

    let data = (rootObject === null) ? this.load() : this.create(rootObject)

    // Since table creation is not a common occurrence (it will usually happen at initial server
    // startup), we take the hit now and proxify the whole structure. From there on, we will proxify
    // on object definition/change.
    const startTime = performance.now()
    this.dataProxy = this.deepProxy(data)
    console.log(`   🗃    ❨WhatDB?❩ Took ${(performance.now() - startTime).toFixed(3)} ms.`)

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
    log(`   🗃    ❨WhatDB?❩ Loading table ${this.tableName}.`)
    const jsonSerialisedTable = fs.readFileSync(this.tablePath, 'utf-8')
    return JSON.parse(jsonSerialisedTable)
  }

  create (rootObject) {
    const tableContents = JSON.stringify(rootObject)
    fs.writeFileSync(this.tablePath, tableContents)
    log(`Created table: ${this.tableName}`)
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
    const tableContents = JSON.stringify(this.dataProxy)
    await fs.writeFile(this.tablePath, tableContents)
    log(`   🗃    ❨WhatDB?❩ Saved table ${this.tableName}.`)
    log(tableContents)
    this.isSaving = false
  }
}

module.exports = WhatTable
