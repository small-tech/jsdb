const Time = require('./Time')
const isProxy = require('util').types.isProxy
const { log, needsToBeProxified } = require('./Util')

const variableReference = (id, property) => `${id}[${!isNaN(parseInt(property)) ? property : `'${property}'`}]`

class DataProxy {

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

    // If this is a custom object (an instance of a class), we have to bind its methods
    // to it manually. Otherwise, for example, if you add a Date instance into the data,
    // you will not be able to access its methods. And calling JSON.stringify on it will
    // fail with this is not a Date instance error.
    if (!Array.isArray(this.data) && typeof this.data[property] === 'function' && typeof this.data[property].bind === 'function') {
      // console.log('>>>>>', this.data[property])
      return this.data[property].bind(this.data)
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

    // Prepare the change statement.
    const keyToken = variableReference(this.id, property)

    let valueToken = value
    switch (typeof value) {
      case 'object':
        console.log(`>>>> Adding object: ${property}`, value)

        const operations = []

        // Update the in-memory store.
        this.data[property] = DataProxy.createDeepProxy(this.table, value, keyToken)

        console.log('...', this.data[property])

        // Break down the changes into its atoms and persist it as a single transaction.
        operations.push(`${keyToken} = ${Array.isArray(value) ? '[]' : '{}'};`)

        Object.keys(value).forEach(key => {
          // TODO: These are happending asynchronously. We need to create do an asyncForEach.
          console.log(`>>   Persisting object: ${key}`)
          // this.data[property][key] = value[key]
          // NOTE: This won’t work for > 1 level. Has to be made recursive. !!!!! TODO []
          const k = typeof key === 'string' ? `'${key}'` : key
          const v = typeof value[key] === 'string' ? `\`${value[key]}\`` : value[key]
          operations.push(`${keyToken}[${k}] = ${v};`)
        })

        const transaction = `(()=>{${operations.join(' ')}})();\n`
        this.table.persistChange(transaction)
      break

      case 'string':
        valueToken = `\`${value}\``
      // fall through

      default:
        // Update the in-memory object graph.
        const change = `${keyToken} = ${valueToken};\n`
        Reflect.set(this.data, property, value, receiver)
        // Persist the change in the append-only log.
        this.table.persistChange(change)

      }

    // const valueToken = typeof value === 'object' ?
    //   `JSON.parse(\`${JSON.stringify(value)}\`)` : typeof value === 'string' ?
    //      `\`${value}\`` : value
    // const change = `${keyToken} = ${valueToken};\n`

    // // Deeply proxify the value if necessary.
    // if (needsToBeProxified(value)) {
    //   value = DataProxy.createDeepProxy(this.table, value, keyToken)
    // }



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

module.exports = DataProxy

const IncompleteQueryProxy = require('./IncompleteQueryProxy')
const QueryProxy = require('./QueryProxy')

