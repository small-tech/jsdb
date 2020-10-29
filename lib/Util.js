////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Util class.
//
// Miscellaneous small generic utilities.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const isProxy = require('util').types.isProxy

class Util {
  static quoteKeyIfNotNumeric (key) {
    // If a key is non-numeric, surrounds it in quotes.
    // Otherwise, leaves it be.
    return isNaN(parseInt(key)) ? `'${key}'` : key
  }

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
