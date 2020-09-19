const isProxy = require('util').types.isProxy

class Util {
  static needsToBeProxified (object) {
    return (object !== null && !isProxy(object) && typeof object === 'object')
  }

  // Conditionally log to console.
  static log (...args) {
    // Note: we have unit tests for the else clause but since
    // ===== we’re monkeypatching console.log() to test invocation
    //       Istanbul/nyc’s coverage is not picking them up properly.
    // istanbul ignore else
    if (process.env.QUIET) {
      return
    }
    // istanbul ignore next
    console.log(...args)
  }
}

module.exports = Util
