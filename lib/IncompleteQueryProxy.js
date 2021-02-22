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
// Note that a connective like ‘and’ or ‘or’ will also return an incomplete
// query proxy.
//
// If you need a good introduction to predicates, see:
// https://www.dcs.warwick.ac.uk/~hugh/M359/What-a-Database-Really-Is.pdf
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
// Copyright ⓒ 2020-2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import QueryOperators from './QueryOperators.js'
import QueryProxy from './QueryProxy.js'

export default class IncompleteQueryProxy {

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
      return Reflect.get(this, property, this)
    }

    if (Reflect.ownKeys(QueryOperators.RELATIONAL_OPERATORS).includes(property)) {
      return (function (value) {
        if (isNaN(value)) value = `'${value}'`
        const updatedQuery = `${this.query} ${QueryOperators.RELATIONAL_OPERATORS[property]} ${value}`
        return new QueryProxy(this.table, this.data, updatedQuery)
      }).bind(this)
    } else if (QueryOperators.FUNCTIONAL_OPERATORS.includes(property)) {
      return (function (value) {
        let updatedQuery = this.query
        // Note: methods with the CaseInsensitive suffix can only be used on
        // ===== string values. Attempting to them use them elsewhere will throw.
        if (property.endsWith('CaseInsensitive')) {
          value = value.toLowerCase()
          updatedQuery += '.toLowerCase()'
        }
        value = `'${value}'`
        // If the property ends with our custom CaseInsensitive, remove the suffix
        // so that it’s correct JavaScript.
        property = property.replace('CaseInsensitive', '')
        updatedQuery += `.${property}(${value})`
        return new QueryProxy(this.table, this.data, updatedQuery)
      }).bind(this)
    }
    else {
      throw new Error(`Invalid operator: ${property}. Valid relational operators are ${Reflect.ownKeys(QueryOperators.RELATIONAL_OPERATORS).join(', ')}. Valid functional operators are ${Reflect.ownKeys(QueryOperators.FUNCTIONAL_OPERATORS).join(', ')}.`)
    }
  }
}
