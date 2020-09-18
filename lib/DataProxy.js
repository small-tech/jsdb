const Time = require('./Time')
const isProxy = require('util').types.isProxy
const { log, needsToBeProxified } = require('./util')

class DataProxy {

  // Factory method. Use this to instantiate a deep (non-lazy) proxified structure.
  static createDeepProxy (table, object) {
    Object.keys(object).forEach(key => {
      const value = object[key]
      if (needsToBeProxified(value)) { object[key] = this.createDeepProxy(table, value) }
    })
    // Proxify the original object itself.
    return new this(table, object)
  }

  // Instance
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
    // console.log('get', target, property, receiver)
    // console.log(`   💾    ❨WhatDB?❩ Getting ${property} on ${this.table.tableName}`)
    Time.mark()
    const result = Reflect.get(this.data, property, receiver)
    // console.log(`   💾    ❨WhatDB?❩  ╰─ Reflection took ${Time.elapsed()} ms.`)
    return result
  }

  setHandler (target, property, value, receiver) {
    // log('set', target, property, value, receiver)
    // console.log(`   💾    ❨WhatDB?❩ Setting ${property} on ${this.table.tableName}…`)
    Time.mark()
    if (needsToBeProxified(value)) { value = DataProxy.createDeepProxy(this.table, value) }
    // console.log(`   💾    ❨WhatDB?❩  ╰─ Deep proxification took ${Time.elapsed()} ms.`)
    Reflect.set(this.data, property, value, receiver)
    // console.log(`   💾    ❨WhatDB?❩  ╰─ Reflection took ${Time.elapsed()} ms.`)
    this.table.save()
    // console.log(`   💾    ❨WhatDB?❩  ╰─ Save took ${Time.elapsed()} ms.`)
    return true
  }

  definePropertyHandler (target, key, descriptor) {
    // console.log('defineProperty', target, key, descriptor)
    return Reflect.defineProperty(this.data, key, descriptor)
  }

  deletePropertyHandler (target, property) {
    // console.log('deleteProperty', target, property)
    const deleteResult = Reflect.deleteProperty(this.data, property)
    if (deleteResult === true) {
      this.table.save()
    }
    return deleteResult
  }
}

module.exports = DataProxy
