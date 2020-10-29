# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
