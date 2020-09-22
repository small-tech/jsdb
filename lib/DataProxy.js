const Time = require('./Time')
const isProxy = require('util').types.isProxy
const { log, needsToBeProxified } = require('./Util')

class DataProxy {

  //
  // Class.
  //

  // Factory method. Use this to instantiate a deep (non-lazy) proxified structure.
  static createDeepProxy (table, object) {
    Object.keys(object).forEach(key => {
      const value = object[key]
      if (needsToBeProxified(value)) { object[key] = this.createDeepProxy(table, value) }
    })
    // Proxify the original object itself.
    return new this(table, object)
  }

  //
  // Instance.
  //

  constructor (table, data) {
    this.table = table
    this.data = data

    // Note: we return a proxy instance; not an instance of DataProxy. Use accordingly.
    return new Proxy(this.data, {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this),
      defineProperty: this.definePropertyHandler.bind(this),
      deleteProperty: this.deletePropertyHandler.bind(this)
    })
  }

  getHandler (target, property, receiver) {
    if (property === '__table__') return this.table

    // The reserved word “where” starts a query. We return a function that
    // that executes and captures the passed property that we want to query
    // on and returns a QueryProxy instance that has references to both the
    // table and that data.
    //
    // Note that queries as well as data set operations execute synchronously
    // so you will not encounter race conditions when using them in web routes.
    if (property === 'where') return (function (property) {
      return new IncompleteQueryProxy(this.table, this.data, `valueOf.${property}`)
    }).bind(this)

    // For more complicated queries (e.g., those involving parentheticals, etc.),
    // you can pass the query string directly.
    // Note that when you do this, you will have to prefix your property names with valueOf.
    // e.g., The query string for where('age').isGreaterThanOrEqualTo(21).and('name').startsWith('A') would be
    // 'valueOf.age >= 21 && valueOf.name.startsWith("A")'
    if (property === 'whereIsTrue') return (function (predicate) {
      return new QueryProxy(this.table, this.data, predicate)
    }).bind(this)

    return Reflect.get(this.data, property, receiver)
  }


  setHandler (target, property, value, receiver) {
    if (needsToBeProxified(value)) { value = DataProxy.createDeepProxy(this.table, value) }
    Reflect.set(this.data, property, value, receiver)
    this.table.save()
    return true
  }


  definePropertyHandler (target, key, descriptor) {
    // Note: we do not trigger a save here as one will be triggered by the setHandler.
    return Reflect.defineProperty(this.data, key, descriptor)
  }


  deletePropertyHandler (target, property) {
    Reflect.deleteProperty(this.data, property)
    this.table.save()
  }
}

module.exports = DataProxy

const IncompleteQueryProxy = require('./IncompleteQueryProxy')
const QueryProxy = require('./QueryProxy')

