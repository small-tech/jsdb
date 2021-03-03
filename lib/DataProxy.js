////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// DataProxy class.
//
// Copyright ⓒ 2020-2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import JSDF from './JSDF.js'
import { needsToBeProxified, quoteKeyIfNotNumeric } from './Util.js'
import IncompleteQueryProxy from './IncompleteQueryProxy.js'
import QueryProxy from './QueryProxy.js'

const variableReference = (id, property) => `${id}[${quoteKeyIfNotNumeric(property)}]`

export default class DataProxy {

  //
  // Class.
  //

  // Factory method. Use this to instantiate a deep (non-lazy) proxified structure.
  static createDeepProxy (table, object, id) {
    Object.keys(object).forEach(key => {
      const value = object[key]
      if (needsToBeProxified(value)) { object[key] = this.createDeepProxy(table, value, variableReference(id, key)) }
    })
    // Proxify the original object itself.
    return new this(table, object, id)
  }

  //
  // Instance.
  //

  constructor (table, data, id) {
    this.table = table
    this.data = data
    this.id = id

    // Note: we return a proxy instance; not an instance of DataProxy. Use accordingly.
    this.proxy = new Proxy(this.data, {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this),
      defineProperty: this.definePropertyHandler.bind(this),
      deleteProperty: this.deletePropertyHandler.bind(this)
    })

    return this.proxy
  }


  getHandler (target, property, receiver) {
    // This is mainly for internal use. Exposes the table instance itself from the data proxy.
    if (property === '__table__') return this.table

    // Enable people to listen for events on the table without having to use the internal __table__ reference.
    if (property === 'addListener') { return this.table.addListener.bind(this.table) }
    if (property === 'removeListener') { return this.table.removeListener.bind(this.table) }

    // Similarly, enable people to delete a table without having to use the internal __table__ reference.
    if (property === 'delete') { return this.table.delete.bind(this.table) }

    // The reserved word “where” starts a query. We return a function
    // that executes and captures the passed property that we want to query
    // on and returns a QueryProxy instance that has references to both the
    // table and that data.
    //
    // Note that queries as well as data set operations execute synchronously
    // so you will not encounter race conditions when using them in web routes.
    if (property === 'where') {
      if (Array.isArray(this.data)) {
        return (function (property) {
          return new IncompleteQueryProxy(this.table, this.data, `valueOf.${property}`)
        }).bind(this)
      } else {
        throw new TypeError('Queries can only be applied to arrays.')
      }
    }

    // For more complicated queries (e.g., those involving parentheticals, etc.),
    // you can pass the query string directly.
    //
    // Note that when you do this, you will have to prefix your property names with valueOf.
    // e.g., The query string for where('age').isGreaterThanOrEqualTo(21).and('name').startsWith('A') would be
    // 'valueOf.age >= 21 && valueOf.name.startsWith("A")'
    if (property === 'whereIsTrue') {
      if (Array.isArray(this.data)) {
        return (function (predicate) {
          return new QueryProxy(this.table, this.data, predicate)
        }).bind(this)
      } else {
        throw new TypeError('Queries can only be applied to arrays.')
      }
    }

    return Reflect.get(this.data, property, receiver)
  }


  setHandler (target, property, value, receiver) {
    // If this is a superfluous call to set the length following a push() statement,
    // do not pollute the transaction log with it.
    if (Array.isArray(target) && property === 'length' && target.length === value) {
      // Update the in-memory object graph but don’t persist.
      Reflect.set(this.data, property, value, receiver)
      return true
    }

    const keyPath = variableReference(this.id, property)

    // Serialise the value update into a JSDF transaction.
    const change = JSDF.serialise(value, keyPath)

    // Update the in-memory store.
    if (typeof value === 'object') {
      this.data[property] = DataProxy.createDeepProxy(this.table, value, keyPath)
    } else {
      Reflect.set(this.data, property, value, receiver)
    }

    // Persist the change.
    this.table.persistChange(change)

    return true
  }


  definePropertyHandler (target, key, descriptor) {
    // Note: we do not trigger a save here as one will be triggered by the setHandler.
    return Reflect.defineProperty(this.data, key, descriptor)
  }


  deletePropertyHandler (target, property) {
    const change = `delete ${variableReference(this.id, property)};\n`
    Reflect.deleteProperty(this.data, property)
    this.table.persistChange(change)
    return true
  }
}
