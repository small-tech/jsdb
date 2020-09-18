const isProxy = require('util').types.isProxy

class DataProxy {

  constructor (table, data) {

    this.table = table
    this.data = data
    console.log('typeof this.table', typeof this.table)

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
    const requestedObject = Reflect.get(this.data, property, receiver)
    // If this is an object and not already a proxy, ensure that it is lazily proxified.
    if (requestedObject !== null && !isProxy(requestedObject) && typeof requestedObject === 'object') {
      console.log('============== NEW DATA PROXY =================', property)
      return new DataProxy(this.table, requestedObject)
    } else {
      return requestedObject
    }
  }

  setHandler (target, property, value, receiver) {
    // log('set', target, property, value, receiver)
    Reflect.set(this.data, property, value, receiver)
    this.table.save()
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
