# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
