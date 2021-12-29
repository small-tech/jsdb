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

  static onlyContainsDigitsAndDoesNotStartWithZero (value) {
    const _valueAsString = value.toString()
    return /^\d+$/.exec(value) !== null && (_valueAsString.length === 1 || _valueAsString[0] !== '0')
  }

  static quoteKeyIfNotSafeInteger (key) {
    // If a key is not a safe integer, surround it in quotes.
    // Otherwise, leave it be.
    const _key = parseFloat(key)
    return Util.onlyContainsDigitsAndDoesNotStartWithZero(key) && !isNaN(_key) && Number.isSafeInteger(_key) ? _key : `'${key}'`
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
