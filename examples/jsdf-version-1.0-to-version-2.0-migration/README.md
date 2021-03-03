# JSDF version 1.0 to 2.0 migration example

There is no automatic built-in migration of version 1.0 (UMD) JSDF files to version 2.0 (ECMAScript Module; ESM) for performance reasons.

If you want to migrate your own databases, you can use the technique demonstrated here.

## Details

This example converts the following JSDF 1.0 file:

```js
globalThis._ = [ { 'name': `Aral`, 'age': 43 }, { 'name': `Laura`, 'age': 34 } ];
(function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.people = globalThis._ } })();
_[1]['age'] = 33;
_[2] = { 'name': `Oskar`, 'age': 8 };
_[2]['name'] = `Osky`;
```

(This is `people.js`, as found in the `db-version-1.0/` folder.)

Into this JSDF 2.0 file:

```js
export const _ = [ { 'name': `Aral`, 'age': 43 }, { 'name': `Laura`, 'age': 34 } ];
_[1]['age'] = 33;
_[2] = { 'name': `Oskar`, 'age': 8 };
_[2]['name'] = `Osky`;
```

(The coverted file is output to the `db/` folder after you run `index.js`.)

## In pseudo-code

To covert from JSDF 1.0 to JSDF 2.0:

1. Replace `globalThis._` with `export const _` on line one.
2. Delete line two.

That’s it.
