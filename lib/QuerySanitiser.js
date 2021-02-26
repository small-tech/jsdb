////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// QuerySanitiser class.
//
// Sanitises a query and returns it or returns an empty array either if
// the query could not be sanitised or if there are no results.
//
// Usage:
//
// QuerySanitiser.sanitiseAndExecuteQueryOnData(query, data)
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
// Copyright ⓒ 2020-2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { log } from './Util.js'
import QueryOperators from './QueryOperators.js'

function globalRegExp () {
  return new RegExp(Array.from(arguments).join(''), 'g')
}

class RegularExpressionLiterals {
  static dot                     = '\\.'
  static semicolon               = ';'
  static backslash               = '\\\\'
  static plugSign                = '\\+'
  static backtick                = '\\`'
  static openingCurlyBracket     = '\\{'
  static closingCurlyBracket     = '\\}'
  static openingSquareBracket    = '\\['
  static closingSquareBracket    = '\\]'
  static dollarSign              = '\\$'
  static singleQuote             = '\''
  static doubleQuote             = '"'
  static openingParenthesis      = '\\('
  static closingParenthesis      = '\\)'
  static verticalBar             = '\\|'
  static ampersand               = '\\&'
  static underscore              = '_'
  static false                   = 'false'
  static true                    = 'true'
  static valueOfDot              = 'valueOf\\.'
  static toLowerCaseFunctionCall = 'toLowerCase()'

  static join () { return Array.from(arguments).join('') } // concatenates into a string.

  // Collections of characters.
  static get logicalOr () {
    return this.join(this.verticalBar, this.verticalBar) // '\\|\\|'
  }

  static get logicalAnd () {
    return this.join(this.ampersand, this.ampersand)    // '\\&\\&`
  }
}

// Regular expression snippets.
class RE {
  static join()         { return Array.from(arguments).join('')         } // concatenates into a string.
  static anyOf()        { return `(${Array.from(arguments).join('|')})` } // creates an alternation (e.g., (x|y)).
  static setOf()        { return `[${Array.from(arguments).join('')}]`  } // creates set (e.g., [xy]).
  static negatedSetOf() { return `[^${Array.from(arguments).join('')}]` } // creates negated set (e.g., [^xy])

  // Literal characters and words.
  static literal = RegularExpressionLiterals

  static whitespace   = '\\s' // spaces, tabs, line breaks.
  static anyDigit     = '\\d' // 0-9.
  static anyCharacter = '.'
  static oneOrMore    = '+'
  static nonGreedy    = '?'
  static zeroOrMore   = '?'

  // Note: we use set here to mean a regular expression set (expressed as a string), not a JavaScript set.
  // [;\\\+\`\{\}\[\]\$]
  static get setOfDangerousCharacters () {
    return this.setOf(
      this.literal.semicolon,
      this.literal.backslash,
      this.literal.plugSign,
      this.literal.backtick,
      this.literal.openingCurlyBracket,
      this.literal.closingCurlyBracket,
      this.literal.openingSquareBracket,
      this.literal.closingSquareBracket,
      this.literal.dollarSign
    )
  }

  // ['"\\(\\)\\s]
  static get setOfAllowedCharacters () {
    return this.setOf(
      this.literal.singleQuote,
      this.literal.doubleQuote,
      this.literal.openingParenthesis,
      this.literal.closingParenthesis,
      this.whitespace
    )
  }

  // .+?
  static get oneOrMoreCharactersNonGreedy () {
    return this.join(this.anyCharacter, this.oneOrMore, this.nonGreedy)
  }

  // (.+?)
  static get oneOrMoreCharactersNonGreedyBetweenLiteralParentheses () {
    return this.join(
      this.literal.openingParenthesis,
      this.oneOrMoreCharactersNonGreedy,
      this.literal.closingParenthesis
    )
  }

  // This should match string representations of numbers, including floating point ones and
  // ones where digits are separated by underscores for readability.
  // [\\d\\._]+?
  static get oneOrMoreDigitsLiteralDotsOrLiteralUnderscoresUntilZeroOrMoreWhitespaces () {
    return this.join(
      this.setOf(
        this.anyDigit,
        this.literal.dot,
        this.literal.underscore
      ),
      this.oneOrMore,
      this.whitespace,
      this.zeroOrMore
    )
  }

  // '.+?'
  static get oneOrMoreCharactersNonGreedyBetweenLiteralSingleQuotes () {
    return this.join(
      this.literal.singleQuote,
      this.oneOrMoreCharactersNonGreedy,
      this.literal.singleQuote
    )
  }

  // ".+?"
  static get oneOrMoreCharactersNonGreedyBetweenLiteralDoubleQuotes () {
    return this.join(
      this.literal.doubleQuote,
      this.oneOrMoreCharactersNonGreedy,
      this.literal.doubleQuote
    )
  }

  // This should match any valid right-hand-side value on a relational operation.
  // ([\\d\\._]+?|'.+?'|".+?"|false|true)
  static get anyValidRelationalOperationValue () {
    return this.anyOf(
      this.oneOrMoreDigitsLiteralDotsOrLiteralUnderscoresUntilZeroOrMoreWhitespaces,
      this.oneOrMoreCharactersNonGreedyBetweenLiteralSingleQuotes,
      this.oneOrMoreCharactersNonGreedyBetweenLiteralDoubleQuotes,
      this.literal.false,
      this.literal.true
    )
  }

  // [^\\.]+?
  static get oneOrMoreCharactersNonGreedyThatAreNotDots () {
    return this.join(
      this.negatedSetOf(
        this.literal.dot
      ),
      this.oneOrMore,
      this.nonGreedy
    )
  }

  static get zeroOrMoreWhitespace () {
    return this.join(
      this.whitespace,
      this.zeroOrMore
    )
  }

  static anyFunctionalOperator = this.anyOf(...QueryOperators.FUNCTIONAL_OPERATORS)
  static anyRelationalOperator = this.anyOf(...QueryOperators.uniqueListOfRelationalOperators)
}

//
// Allowed elements.
//

class Allowed {
  // Statements in the form valueOf.toLowerCase().startsWith(…), etc.
  // /valueOf\..+?\.toLowerCase()\.(startsWith|endsWith|includes|startsWithCaseInsensitive|endsWithCaseInsensitive|includesCaseInsensitive)\(.+?\)/g
  static functionalOperationsCaseInsensitive = globalRegExp(
    RE.literal.valueOfDot,
    RE.oneOrMoreCharactersNonGreedy,
    RE.literal.dot,
    RE.literal.toLowerCaseFunctionCall,
    RE.literal.dot,
    RE.anyFunctionalOperator,
    RE.oneOrMoreCharactersNonGreedyBetweenLiteralParentheses
  )

  // Statements in the form valueOf.startsWith(…), etc.
  // /valueOf\..+?\.(startsWith|endsWith|includes|startsWithCaseInsensitive|endsWithCaseInsensitive|includesCaseInsensitive)\(.+?\)/g
  static functionalOperations = globalRegExp(
    RE.literal.valueOfDot,
    RE.oneOrMoreCharactersNonGreedy,
    RE.literal.dot,
    RE.anyFunctionalOperator,
    RE.oneOrMoreCharactersNonGreedyBetweenLiteralParentheses
  )

  // Statements in the form valueOf.<property> === <value>, etc.
  // /valueOf\.[^\.]+?\s?(===|!==|>|>=|<|<=)\s?([\d\._]+\s?|'.+?'|".+?"|false|true)/g
  static relationalOperations = globalRegExp(
    RE.literal.valueOfDot,
    RE.oneOrMoreCharactersNonGreedyThatAreNotDots,
    RE.zeroOrMoreWhitespace,
    RE.anyRelationalOperator,
    RE.zeroOrMoreWhitespace,
    RE.anyValidRelationalOperationValue
  )

  // Logical OR.
  // /\|\|/g
  static logicalOr = globalRegExp(RE.literal.logicalOr)

  // Logical AND.
  // /\&\&/g
  static logicalAnd = globalRegExp(RE.literal.logicalAnd)

  // Single and double quotation marks, parentheses, and whitespace.
  // /['"\(\)\s]/g
  static allowedCharacters = globalRegExp(RE.setOfAllowedCharacters)
}


//
// Disallowed elements.
//


class Disallowed {
  // /[;\\\+\`\{\}\$]/g
  static dangerousCharacters = globalRegExp(RE.setOfDangerousCharacters)
}


//
// Main class.
//


export default class QuerySanitiser {

  static Allowed = Allowed
  static Disallowed = Disallowed

  // Sanitises the provided query and runs it on the provided data.
  // If there is a sanitisation issue or if there are no results,
  // an empty array is returned.
  static sanitiseAndExecuteQueryOnData (queryString, data) {
    // First, remove any disallowed dangerous characters.

    if (Disallowed.dangerousCharacters.test(queryString)) {
      // Disallowed character(s) found, reject.
      // log('   💾    ❨JSDB❩ Warning: disallowed character(s) found in query string; rejecting.', queryString)
      return []
    }

    // Next, let’s see if there’s anything nefarious left after
    // we strip away everything that we expect to be there.
    let sieve = queryString
      .replace(Allowed.functionalOperationsCaseInsensitive, '')
      .replace(Allowed.functionalOperations, '')
      .replace(Allowed.relationalOperations, '')
      .replace(Allowed.logicalOr, '')
      .replace(Allowed.logicalAnd,'')
      .replace(Allowed.allowedCharacters, '')

    // Initialise the result array.
    let result = []

    // Only run the query if the sieve is empty.
    if (sieve === '') {
      // Write out the final query string.
      // To further restrict it, specify that it must be run in strict mode.
      const finalQueryString = `'use strict'; return (${queryString});`

      // Create the query function.
      let query
      try {
        query = new Function('valueOf', finalQueryString)
      } catch (error) {
        // Syntax error in query string, reject.
        // log('   💾    ❨JSDB❩ Warning: syntax error in query string; rejecting.', queryString, error)
        return []
      }

      // OK, the query should now be safe to run.
      result = data.filter(function(value) {
        try {
          return query(value)
        } catch (error) /* c8 ignore start */ {
          // Unexpected error: something went wrong while executing the query.
          // (This should not happen as all errors should have been caught before this point.)
          log('   💾    ❨JSDB❩ Warning: query function threw unexpected error; rejecting.', queryString, error)
          return false
        } /* c8 ignore stop */
      })
    }

    return result
  }
}
