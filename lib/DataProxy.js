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
    return new Proxy(data, {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this),
      defineProperty: this.definePropertyHandler.bind(this),
      deleteProperty: this.deletePropertyHandler.bind(this)
    })
  }


  getHandler (target, property, receiver) {
    if (property === '__table__') return this.table
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
