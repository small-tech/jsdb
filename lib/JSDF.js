////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// JSDF class.
//
// Copyright ⓒ 2020-2021 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Recursively serialises a JavaScript data structure into JavaScript Data Format (a series
// of JavaScript statements that atomically recreates said data structure when run).
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { quoteKeyIfNotNumeric } from './Util.js'

export default class JSDF {
  static serialise (value, key, parentType = null) {
    // Check that key is valid.
    if (key === undefined || key === null) {
      throw new Error('Key cannot be undefined or null.')
    }

    const objectType = value === undefined ? 'undefined' : value === null ? 'null' : value.constructor.name === '' ? 'unknown' : value.constructor.name

    let serialisedValue

    // Attempt to serialise if this is a supported intrinsic object
    // (and throw an error if it is an unsupported intrinsic object).
    switch (objectType) {
      //
      // Supported intrinsic objects.
      //

      // Simple data types that don’t need to be modified.
      // Note: Number will include Infinity and NaN. This is fine.
      case 'Number':
      case 'Boolean':
      case 'undefined':
      case 'null': {
        serialisedValue = value
        break
      }

      case 'String': {
        //
        // Note: it is important that we sanitise string input before storing it to
        // ===== thwart arbitrary code execution via injection attacks. So we:
        //
        // - Escape all backslashes (why? See https://source.small-tech.org/site.js/lib/jsdb/-/issues/9#note_15844)
        // - Escape all backticks (why? See https://source.small-tech.org/site.js/lib/jsdb/-/issues/9#note_15848)
        // - Escape all dollar signs (why? See https://source.small-tech.org/site.js/lib/jsdb/-/issues/9)
        //
        serialisedValue = `\`${value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\``
        break
      }

      case 'Object': {
        const children = []
        for (let childKey in value) {
          const childValue = value[childKey]
          children.push(JSDF.serialise(childValue, childKey, 'object'))
        }
        serialisedValue = `{ ${children.join(', ')} }`
        break
      }

      case 'Array': {
        const children = []
        const numberOfChildren = value.length
        for (let i = 0; i < numberOfChildren; i++) {
          const childValue = value[i]
          children.push(JSDF.serialise(childValue, i, 'array'))
        }
        serialisedValue = `[ ${children.join(', ')} ]`
        break
      }

      case 'Date':
        serialisedValue = `new Date('${value.toJSON()}')`
        break

      case 'Symbol':
        serialisedValue = `Symbol.for(value.description)`
        break

      //
      // Unsupported intrinsic objects.
      // For reference, see:
      // http://www.ecma-international.org/ecma-262/6.0/#sec-well-known-intrinsic-objects
      //

      // Might support in the future.
      case 'Map':
      case 'Set':

      case 'WeakMap':
      case 'WeakSet':

      // Note TypedArray is not included as it is never directly exposed.
      // (See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)
      case 'ArrayBuffer':
      case 'Float32Array':
      case 'Float64Array':
      case 'Int8Array':
      case 'Int16Array':
      case 'Int32Array':
      case 'Uint8Array':
      case 'Uint16Array':
      case 'Uint32Array':
      case 'Uint8ClampedArray':

      //
      // Does not make sense to support.
      //

      // (Note: we do not include Proxy here since, by its very nature, it is a transparent datatype.
      // We couldn’t detect it using this method anyway; we’d have to use util.types.isProxy().)

      case 'DataView':
      case 'Function':
      case 'GeneratorFunction':
      case 'Generator':
      case 'Promise':
      case 'RegExp':

      case 'Error':
      case 'EvalError':
      case 'RangeError':
      case 'ReferenceError':
      case 'SyntaxError':
      case 'TypeError':
      case 'URIError': {
        throw new TypeError(`You cannot store objects of type ${objectType} in JSDB.`)
        // (no break necessary after throwing an error)
      }

      case 'unknown': {
        throw new TypeError(`Cannot store object with unknown type in JSDB (did you try to store a generator instance?)`)
        // (no break necessary after throwing an error)
      }

      default: {
        const children = []
        for (let childKey in value) {
          const childValue = value[childKey]
          children.push(JSDF.serialise(childValue, childKey, 'object'))
        }
        const properties = `{ ${children.join(', ')} }`

        serialisedValue = `Object.create(typeof ${objectType} === 'function' ? ${objectType}.prototype : {}, Object.getOwnPropertyDescriptors(${properties}))`
        break
      }
    }

    let serialisedStatement
    switch(parentType) {
      case null: {
        serialisedStatement = `${key} = ${serialisedValue};\n`
        break
      }

      case 'object': {
        serialisedStatement = `${quoteKeyIfNotNumeric(key)}: ${serialisedValue}`
        break
      }

      case 'array': {
        serialisedStatement = serialisedValue
        break
      }
    }

    return serialisedStatement
  }
}
