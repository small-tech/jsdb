# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.4] - 2021-07-30

### Improved

  - Minor: Refactored change in last release for clarity (“naming things is hard”). Removed log statement.

## [2.0.3] - 2021-07-30

### Fixed

  - Table load no longer crashes if data contains multiline string (#10)

## [2.0.2] - 2021-04-23

### Improved

  - Nothing. This is a superflous release because apparently [npm cannot intelligently handle publishing a fix for an earlier major version](https://stackoverflow.com/questions/24691314/npm-publish-patch-for-earlier-major-version).

## [2.0.1] - 2021-03-03

### Improved

  - npm package size reduced to 29.7kb (97.3kb unpacked) from 62.8kb (260.4kb unpacked) by specifying whitelist of included files in package file.
  - Reduced size of license file by not including the whole AGPL license text (that’s what URLs are for).

## [2.0.0] - 2021-03-03

### Breaking changes

  - Uses EcmaScript Modules (ESM). (Requires Node 14 or later.)
  - JSDF now only supports/serialises to ESM format.

### Changed

  - For regular/smaller data sets (under 500MB), JSDB now reads the file in synchronously and evals it, instead of using `require()`, as before. (I chose not to use a dynamic `import()` as it is asynchronous.)
  - For larger data sets, we’re now using an inlined version of `n-readlines`.
  - The module now has zero runtime dependencies.

### Added

  - 32KB distribution version (run `npm run build` and find it in `dist/index.js`).

## [1.1.5] - 2020-10-31

### Improved

  - Attempt to create a query on a non-array object now throws `TypeError`. (#12)

## [1.1.4] - 2020-10-29

### Fixed

  - Object keys containing non-alphanumeric characters are now properly supported. (#11)

## [1.1.3] - 2020-10-28

### Improved

Query security updates:

  - Fail faster on disallowed character detection.
  - Fail at function creation instead of code execution on syntax error by using function constructor instead of eval.
  - Add square brackets to disallowed characters. As far as I can see, [esoteric](http://www.businessinfo.co.uk/labs/talk/Nonalpha.pdf) [approaches](http://slides.com/sylvainpv/xchars-js/) to writing non-alphanumeric JavaScript were already being thwarted by disallowing the plus sign, semicolon, etc., but there’s no harm in removing these also as subscript syntax is powerful in JavaScript.
  - Add a few more tests.

## [1.1.2] - 2020-10-23

### Improved

  - Refactor query sanitisation code to make it safer and more maintainable; add tests.

## [1.1.1] - 2020-10-21

### Fixed

  - Make sanitisation regular expression less greedy (the sieve now catches injection attempts it was previously missing).
  - Boolean value support in queries now works properly (was previously being filtered by the sieve).

### Added

  - Missing test for boolean values in queries.

## [1.1.0] - 2020-10-21

### Added

  - Now sanitising queries to prevent arbitrary code execution via injection attacks.

## [1.0.0] - 2020-10-19

Initial release.
