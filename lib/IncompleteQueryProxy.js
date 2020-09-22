////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// IncompleteQueryProxy class.
//
// An incomplete query is one that is not ready to be executed as contains an
// incomplete predicate (where the subject is known but the condition hasn’t
// been specified yet).
//
// e.g., database.people.where('age').isGreaterThan(21)
//                      ╰─────┬─────╯
//                       incomplete
//                      ╰──────────────┬─────────────╯
//                                 complete
//
// Note that a connective like and or or will also return an incomplete
// query proxy.
//
// If you need a good introduction to predicates, see:
// https://www.dcs.warwick.ac.uk/~hugh/M359/What-a-Database-Really-Is.pdf
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const QueryProxy = require('./QueryProxy')

const STRICT_EQUALS = '==='

const CONDITIONS = {
  is: STRICT_EQUALS,
  isEqualTo: STRICT_EQUALS,
  equals: STRICT_EQUALS,

  isNot: '!==',

  isGreaterThan: '>',
  isGreaterThanOrEqualTo: '>=',
  isLessThan: '<',
  isLessThanOrEqualTo: '<='
}

class IncompleteQueryProxy {

  constructor (table, data, property) {
    this.table = table
    this.data = data
    this.query = property

    // Note: we return a proxy instance; not an instance of DataProxy. Use accordingly.
    return new Proxy({}, { get: this.getHandler.bind(this) })
  }

  getHandler (target, property, receiver) {
    // Let calls go through as usual for property access of our own properties.
    if (Reflect.ownKeys(this).includes(property)) {
      return Reflect.get(...arguments)
    }

    if (CONDITIONS[property] === undefined) {
      throw new Error(`Invalid condition: ${property}. Valid conditions are ${Reflect.ownKeys(CONDITIONS).join(', ')}.`)
    }

    return (function (value) {
      if (isNaN(value)) value = `'${value}'`
      const updatedQuery = `value.${this.query} ${CONDITIONS[property]} ${value}`
      return new QueryProxy(this.table, this.data, updatedQuery)
    }).bind(this)
  }
}

module.exports = IncompleteQueryProxy
