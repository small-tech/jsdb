////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// QueryProxy class.
//
// This is a query proxy that is ready for execution. Any property access attempt other than
// a connective (and/or) will lazily evaluate and return a deep data proxy of the result
// of the query.
//
// (The whole reason we return this intermediary proxy instead of a DataProxy is to allow
// for connectives for conditionals in the predicate).
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const { log, needsToBeProxified } = require('./Util')
const isProxy = require('util').types.isProxy


class QueryProxy {

  #cachedResult = null

  constructor (table, data, query) {
    this.table = table
    this.data = data
    this.query = query

    return new Proxy({}, {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this),
      defineProperty: this.definePropertyHandler.bind(this),
      deleteProperty: this.deletePropertyHandler.bind(this)
    })
  }

  get cachedResult () {
    if (this.#cachedResult === null) {
      console.log(`Evaluating and caching result of query: ${this.query} on data`, this.data)
      this.#cachedResult = this.data.filter(value => { return eval(this.query) })
    }
    return this.#cachedResult
  }

  getHandler (target, property, receiver) {
    if (property === 'get') {
      return (function () {
        return this.cachedResult
      }).bind(this)
    }

    //
    // Handle connectives.
    //
    if (property === 'and') return (function (connectiveProperty) {
      const incompleteQuery = `${this.query} && value.${connectiveProperty}`
      return new IncompleteQueryProxy(this.table, this.data, incompleteQuery)
    }).bind(this)

    if (property === 'and') return (function (connectiveProperty) {
      const incompleteQuery = `${this.query} || value.${connectiveProperty}`
      return new IncompleteQueryProxy(this.table, this.data, incompleteQuery)
    }).bind(this)

    // If nothing else matches, just do the default.
    return Reflect.get(this.cachedResult, property, receiver)
  }

  //
  // Note: any property manipulation happens on the cached result of the
  // ===== query and does not effect the original data. The caveat is that
  //       if you manipulate *individual results*, then you are working with
  //       references to the original data and your manipulations will be
  //       persisted. This feels intuitive/expected.
  //

  setHandler (target, property, value, receiver) {
    return Reflect.set(this.cachedResult, property, value, receiver)
  }

  definePropertyHandler (target, key, descriptor) {
    return Reflect.defineProperty(this.cachedResult, key, descriptor)
  }

  deletePropertyHandler (target, property) {
    Reflect.deleteProperty(this.cachedResult, property)
  }
}

module.exports = QueryProxy

const DataProxy = require('./DataProxy')
const IncompleteQueryProxy = require('./IncompleteQueryProxy')
