////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// QueryOperators class.
//
// Constants that represent supported operators in queries.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
// Copyright ⓒ 2020-2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export default class QueryOperators {

  static STRICT_EQUALS = '==='
  static STRICT_DOES_NOT_EQUAL = '!=='

  static RELATIONAL_OPERATORS = {
    is: this.STRICT_EQUALS,
    isEqualTo: this.STRICT_EQUALS,
    equals: this.STRICT_EQUALS,

    isNot: this.STRICT_DOES_NOT_EQUAL,
    doesNotEqual: this.STRICT_DOES_NOT_EQUAL,

    isGreaterThan: '>',
    isGreaterThanOrEqualTo: '>=',
    isLessThan: '<',
    isLessThanOrEqualTo: '<='
  }

  static FUNCTIONAL_OPERATORS = [
    'startsWith',
    'endsWith',
    'includes',
    'startsWithCaseInsensitive',
    'endsWithCaseInsensitive',
    'includesCaseInsensitive'
  ]

  static get uniqueListOfRelationalOperators () {
   return Array.from(new Set(Object.values(QueryOperators.RELATIONAL_OPERATORS)))
  }
}
