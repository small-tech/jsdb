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
    let tablePaths
    try {
      tablePaths = fs.readdirSync(this.basePath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Base path does not exist.`)
      } else {
        throw error
      }
    }
    console.log(tablePaths)
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
    Reflect.set(target, property, value, receiver)
    if (this.isPlainObject(value) || Array.isArray(value)) {
      this.proxify(target, property)
    }
    this.createTable(property, value)
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
