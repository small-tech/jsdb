const isProxy = require('util').types.isProxy

class Util {
  static isPlainObject (x) {
    return x !== null && x.constructor === Object
  }

  static needsToBeProxified (object) {
    return (object !== null && !isProxy(object) && typeof object === 'object')
  }

  // Conditionally log to console.
  static log (...args) {
    if (process.env.QUIET) {
      return
    }
    console.log(...args)
  }
}

module.exports = Util
