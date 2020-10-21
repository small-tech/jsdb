////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// QueryProxy class.
//
// This is a query proxy that is ready for execution. Any property access attempt other than
// a connective (and/or) will lazily evaluate and return a deep data proxy of the result
// of the query.
//
// (The whole reason we return this intermediary proxy instead of a DataProxy is to allow
// for connectives for conditionals in the predicate).
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Circular module requires at end of file:
//   - IncompleteQueryProxy

class QueryProxy {

  #cachedResult = null


  constructor (table, data, query) {
    this.table = table
    this.data = data
    this.query = query

    return new Proxy({}, {
      get: this.getHandler.bind(this),
      set: this.setHandler.bind(this),
      deleteProperty: this.deletePropertyHandler.bind(this)
    })
  }


  get cachedResult () {
    if (this.#cachedResult === null) {

      //
      // Sanitise the query
      //

      // Remove statement terminators, etc. Sorry, Little Bobby Tables.
      this.query = this.query.replace(/[;\\\+\`\{\}\$]/g, '')

      // Now let’s see if there’s anything nefarious left after we strip away
      // the things we expect to be there. This isn’t perfect if the attacker
      // knows enough to surround their attacks using valueOf assignments
      // but it will catch arbitrary attempts, especially if the codebase
      // uses whereIsTrue() instead of where() and return without traversing the
      // data graph. Anything not caught here will trigger an error during
      // the array filter
      let sieve = this.query
        .replace(/valueOf\..+?\.toLowerCase()\.(startsWith|endsWith|includes|startsWithCaseInsensitive|endsWithCaseInsensitive|includesCaseInsensitive)\(.+?\)/g, '')
        .replace(/valueOf\..+?\.(startsWith|endsWith|includes|startsWithCaseInsensitive|endsWithCaseInsensitive|includesCaseInsensitive)\(.+?\)/g, '')
        .replace(/valueOf\.[^\.]+?\s?(===|\!==|<|>|<=|>=)\s?([\d_\.]+\s?|'.+?'|".+?"|false|true)/g, '')
        .replace(/\|\|/g, '')
        .replace(/\&\&/g,'')
        .replace(/['"\(\)\s]/g, '')

      if (sieve !== '') {
        // There is still something in our sieve and there shouldn’t be.
        // Reject this as a possible arbitrary code execustion attack via injection.
        this.#cachedResult = []
      } else {
        // OK, this query should be safe to run. Note that it is still possible
        // that there is a malformed injection attack and this will cause an error
        // on eval. We catch and handle that accordingly, below.
        this.#cachedResult = this.data.filter(valueOf => {
          try {
            return eval(this.query)
          } catch (error) {
            // Possible injection attack, return false.
            return false
          }
        })
      }
    }
    return this.#cachedResult
  }


  getHandler (target, property, receiver) {
    if (property === 'get') {
      return (function () {
        return this.cachedResult
      }).bind(this)
    }

    //
    // Handle subsets.
    //
    if (property === 'getFirst') {
      return (function () {
        return this.cachedResult[0]
      }).bind(this)
    }

    if (property === 'getLast') {
      return (function () {
        return this.cachedResult[this.cachedResult.length - 1]
      }).bind(this)
    }

    //
    // Handle connectives.
    //
    if (property === 'and') return (function (connectiveProperty) {
      const incompleteQuery = `${this.query} && valueOf.${connectiveProperty}`
      return new IncompleteQueryProxy(this.table, this.data, incompleteQuery)
    }).bind(this)

    if (property === 'or') return (function (connectiveProperty) {
      const incompleteQuery = `${this.query} || valueOf.${connectiveProperty}`
      return new IncompleteQueryProxy(this.table, this.data, incompleteQuery)
    }).bind(this)

    // If nothing else matches, just do the default.
    return Reflect.get(this.cachedResult, property, receiver)
  }

  //
  // Note: any property manipulation happens on the cached result of the
  // ===== query and does not effect the original data. The caveat is that
  //       if you manipulate *individual results*, then you are working with
  //       references to the original data and your manipulations will be
  //       persisted. This feels intuitive/expected.
  //

  setHandler (target, property, value, receiver) {
    return Reflect.set(this.cachedResult, property, value, this.cachedResult)
  }

  deletePropertyHandler (target, property) {
    return Reflect.deleteProperty(this.cachedResult, property)
  }

  // Note: a defineProperty handler is not required here as it never
  // ===== gets called, even if setting a property here (only the
  //       set handler gets called).
}

module.exports = QueryProxy

const IncompleteQueryProxy = require('./IncompleteQueryProxy')
