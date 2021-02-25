////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// QueryOperators class.
//
// Constants that represent supported operators in queries.
//
// Like QueryOperators? Fund us!
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
    // Note: do not use “this” here until this bug in esbuild is fixed
    // ===== as it messes up the distribution bundle:
    //       https://github.com/evanw/esbuild/issues/885
    is: QueryOperators.STRICT_EQUALS,
    isEqualTo: QueryOperators.STRICT_EQUALS,
    equals: QueryOperators.STRICT_EQUALS,

    isNot: QueryOperators.STRICT_DOES_NOT_EQUAL,
    doesNotEqual: QueryOperators.STRICT_DOES_NOT_EQUAL,

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
