globalThis._ = [ { 'name': `Aral`, 'age': 43 }, { 'name': `Laura`, 'age': 34 } ];
(function () { if (typeof define === 'function' && define.amd) { define([], globalThis._); } else if (typeof module === 'object' && module.exports) { module.exports = globalThis._ } else { globalThis.people = globalThis._ } })();
_[1]['age'] = 33;
_[2] = { 'name': `Oskar`, 'age': 8 };
_[2]['name'] = `Osky`;
