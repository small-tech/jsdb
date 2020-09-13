////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// WhatDB?
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fs = require('fs-extra')
const path = require('path')
const { isObject } = require('util')

class WhatDB {
  constructor (basePath) {
    this.basePath = basePath

    this.isSaving = false
    this.saveRequested = false

    this.data = new Proxy({}, this.rootHandler)

    // Load any existing data there might be.
    this.loadTables()
  }

  loadTables () {
    this.loadingTables = true
    let tableFiles
    try {
      tableFiles = fs.readdirSync(this.basePath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Base path does not exist.`)
      } else {
        throw error
      }
    }
    tableFiles.forEach(tableFile => {
      const tableName = tableFile.replace('.json', '')
      const tablePath = path.join(this.basePath, tableFile)
      console.log(`Loading table ${tableName} from ${tablePath}…`)
      const serialisedTable = fs.readFileSync(tablePath, 'utf-8')
      this.data[tableName] = JSON.parse(serialisedTable)
    })
    this.loadingTables = false
  }

  get rootHandler () {
    return {
      set: this.setRootHandler.bind(this)
    }
  }

  get handler () {
    return {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this)
    }
  }

  setRootHandler (target, property, value, receiver) {
    // Only objects and arrays are allowed on the root level.
    // Each object/array in the root can be considered a table
    // and is kept in its own JSON file.
    const isObjectOrArray = this.isPlainObject(value) || Array.isArray(value)
    if (!isObjectOrArray) {
      throw new Error(`Only objects and arrays may be added to the root .data element.`)
    }

    Reflect.set(target, property, value, receiver)
    this.proxify(target, property)

    // If we’re initially loading tables, do not attempt to recreate the files
    // that we’re loading the tables from.
    if (!this.loadingTables) {
      this.createTable(property, value)
    }
    return true
  }

  createTable (property, value) {
    const tableName = `${property}.json`
    const tablePath = path.join(this.basePath, tableName)
    const tableContents = JSON.stringify(value)
    fs.writeFileSync(tablePath, tableContents)
    console.log(`Created table ${tableName}`, tableContents)
  }

  proxify (target, property) {
    // For now, just do a shallow proxy.
    // TODO: proxify the whole tree.
    new Proxy(target[property], this.handler)
  }

  getHandler (target, property, receiver) {
    Reflect.get(...arguments)
    return true
  }

  setHandler (target, property, value, receiver) {
    if (this.isPlainObject(value) || Array.isArray(value)) {
      this.proxify(value)
    }
    Reflect.set(target, property, value, receiver)
    this.save()
    return true
  }

  save () {
    this.saveRequested = true
    if (this.isSaving) return
  }

  isPlainObject (x) { return x !== null && x.constructor === Object }

}

module.exports = WhatDB
