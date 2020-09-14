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
const { isPlainObject } = require('./util')

class WhatTable {
  // Either loads the table at the passed table path (default) or, if
  // a root object is passed, creates a new table at table path, populating
  // it with the passed root object.
  constructor(tablePath, rootObject = null) {
    this.tablePath = tablePath
    this.tableFileName = tablePath.slice(tablePath.lastIndexOf(path.sep)+1)
    this.rootObject = rootObject

    this.isSaving = false
    this.saveRequested = false

    let data = (rootObject === null) ? this.load() : this.create()

    // TODO: make this a deep proxification.
    this.dataProxy = new Proxy (data, this.proxyHandler)

    // NB. we are returning the data proxy, not an
    // instance of WhatTable. Use accordingly.
    return this.dataProxy
  }

  load() {
    console.log(`Loading table ${this.tableFileName}…`)
    const jsonSerialisedTable = fs.readFileSync(this.tablePath, 'utf-8')
    return JSON.parse(jsonSerialisedTable)
  }

  create () {
    const tableContents = JSON.stringify(this.rootObject)
    fs.writeFileSync(this.tablePath, tableContents)
    console.log(`Created table ${this.tableFileName}`, tableContents)
    return this.rootObject
  }

  get proxyHandler () {
    return {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this)
    }
  }

  getHandler (target, property, receiver) {
    return Reflect.get(...arguments)
  }

  setHandler (target, property, value, receiver) {
    console.log('===========>', property)
    console.log('=============set=================', target, property, value, receiver)
    if (isPlainObject(value) || Array.isArray(value)) {
      // TODO: make this a deep proxification.
      value = new Proxy(value, this.proxyHandler)
    }
    Reflect.set(target, property, value, receiver)
    this.save()
    return true
  }

  save () {
    console.log('save called!')

    if (this.saveTimer.hasRef()) {
      console.log('Already waiting to save, ignoring subsequent requests on the same cycle of the event loop.')
      return
    }

    this.saveTimer = setImmediate(this.__save.bind(this))
  }

  __save () {
    // We are in the process of saving the file so don’t try to overwrite it.
    if (this.isSaving) {
      // Ensure we keep trying.
      this.save()
      return
    }

    // OK, it’s safe to save.
    console.log('Saving.')
  }
}

module.exports = WhatTable
