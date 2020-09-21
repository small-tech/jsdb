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

const DataProxy = require('./DataProxy')
const { log, needsToBeProxified } = require('./Util')

class QueryProxy {

  constructor (table, data, query) {
    this.table = table
    this.data = data
    this.query = query

    this.cachedResult = null

    return new Proxy({}, {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this),
      defineProperty: this.definePropertyHandler.bind(this),
      deleteProperty: this.deletePropertyHandler.bind(this)
    })
  }

  getHandler (target, property, receiver) {
    if (property === 'and' || property === 'or') return function (property) {
      const incompleteQueryProxy = IncompleteQueryProxy(this.table, this.data, property)
      console.log(`[${property}] incomplete query proxy`, incompleteQueryProxy)
      return incompleteQueryProxy
    }

    if (this.cachedResult === null) {
      // Lazily evaluate the result on first access.
      this.evaluateQuery()
    }

    return Reflect.get(this.cachedResult, property, receiver)
  }

  setHandler (target, property, value, receiver) {
    if (this.cachedResult === null) {
      // Lazily evaluate the result on first access.
      this.evaluateQuery()
    }
    if (needsToBeProxified(value)) { value = DataProxy.createDeepProxy(this.table, value) }
    Reflect.set(this.cachedResult, property, value, receiver)
    this.table.save()
    return true
  }


  definePropertyHandler (target, key, descriptor) {
    if (this.cachedResult === null) {
      // Lazily evaluate the result on first access.
      this.evaluateQuery()
    }
    // Note: we do not trigger a save here as one will be triggered by the setHandler.
    return Reflect.defineProperty(this.data, key, descriptor)
  }


  deletePropertyHandler (target, property) {
    if (this.cachedResult === null) {
      // Lazily evaluate the result on first access.
      this.evaluateQuery()
    }
    Reflect.deleteProperty(this.cachedResult, property)
    this.table.save()
  }
}
