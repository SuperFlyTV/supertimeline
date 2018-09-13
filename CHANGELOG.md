# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="6.0.1"></a>
## [6.0.1](https://github.com/SuperFlyTV/supertimeline/compare/5.0.6...6.0.1) (2018-09-13)



<a name="5.0.6"></a>
## [5.0.6](https://github.com/SuperFlyTV/supertimeline/compare/5.0.5...5.0.6) (2018-09-13)


### Bug Fixes

* TimelineObject duration can be a string ([edf3ae3](https://github.com/SuperFlyTV/supertimeline/commit/edf3ae3))



<a name="5.0.5"></a>
## [5.0.5](https://github.com/SuperFlyTV/supertimeline/compare/5.0.4...5.0.5) (2018-09-13)


### Bug Fixes

* cap startTime within parent group ([4e913ba](https://github.com/SuperFlyTV/supertimeline/commit/4e913ba))
* changed duration interpretation to support Infinite duration properly ([489fc4e](https://github.com/SuperFlyTV/supertimeline/commit/489fc4e))
* duration can be undefined ([bc278d6](https://github.com/SuperFlyTV/supertimeline/commit/bc278d6))



<a name="5.0.4"></a>
## [5.0.4](https://github.com/SuperFlyTV/supertimeline/compare/5.0.3...5.0.4) (2018-09-04)


### Bug Fixes

* nested parentheses bug ([a828cea](https://github.com/SuperFlyTV/supertimeline/commit/a828cea))
* operator order bug ([00f5186](https://github.com/SuperFlyTV/supertimeline/commit/00f5186))



<a name="5.0.3"></a>
## [5.0.3](https://github.com/SuperFlyTV/supertimeline/compare/5.0.2...5.0.3) (2018-09-04)


### Bug Fixes

* when possible, save outerDuration of group before resolving it's children ([f0785a2](https://github.com/SuperFlyTV/supertimeline/commit/f0785a2))



<a name="5.0.2"></a>
## [5.0.2](https://github.com/SuperFlyTV/supertimeline/compare/5.0.1...5.0.2) (2018-08-29)


### Bug Fixes

* bug when capping endTime several parents up ([25e600d](https://github.com/SuperFlyTV/supertimeline/commit/25e600d))



<a name="5.0.1"></a>
## [5.0.1](https://github.com/SuperFlyTV/supertimeline/compare/5.0.0...5.0.1) (2018-08-17)


### Bug Fixes

* don't throw error ([b35e955](https://github.com/SuperFlyTV/supertimeline/commit/b35e955))



<a name="5.0.0"></a>
# [5.0.0](https://github.com/SuperFlyTV/supertimeline/compare/4.0.2...5.0.0) (2018-08-17)


### Features

* Major refactoring, switched out the iterative resolving for a nice recursive one ([13cbace](https://github.com/SuperFlyTV/supertimeline/commit/13cbace))


### BREAKING CHANGES

* removed circular, iterative resolving. Might cause unexpected issues



<a name="4.0.2"></a>
## [4.0.2](https://github.com/SuperFlyTV/supertimeline/compare/4.0.1...4.0.2) (2018-08-05)


### Bug Fixes

* added referenceObjectIds, to use as trace in error messages & to determine which object is dependant of which ([e50ec99](https://github.com/SuperFlyTV/supertimeline/commit/e50ec99))
* inefficient iteration led to terrible performance in situations with many relative objects. Rehauled the whole resolve iteration loop ([3a2b847](https://github.com/SuperFlyTV/supertimeline/commit/3a2b847))



<a name="4.0.1"></a>
## [4.0.1](https://github.com/SuperFlyTV/supertimeline/compare/4.0.0...4.0.1) (2018-08-03)


### Bug Fixes

* quick patch for when resolved property missing ([66f1adf](https://github.com/SuperFlyTV/supertimeline/commit/66f1adf))



<a name="4.0.0"></a>
# [4.0.0](https://github.com/SuperFlyTV/supertimeline/compare/2.2.0...4.0.0) (2018-07-30)


### Bug Fixes

* bugfix for passing test "relative durations object order" ([31a886f](https://github.com/SuperFlyTV/supertimeline/commit/31a886f))
* refactored the tests, making them all run with the data reversed as well ([e823243](https://github.com/SuperFlyTV/supertimeline/commit/e823243))
* refactoring: object resolving iteration loop, so the same function is used inside groups as well as on root ([36fbb58](https://github.com/SuperFlyTV/supertimeline/commit/36fbb58))
* test incompatible with reversed data ([8fceadc](https://github.com/SuperFlyTV/supertimeline/commit/8fceadc))


### Features

* Add test to check order of objects in the source data has no affect on relative duration resolving ([2551789](https://github.com/SuperFlyTV/supertimeline/commit/2551789))
* added ability to reference objects between groups ([80bbb4a](https://github.com/SuperFlyTV/supertimeline/commit/80bbb4a))
* added test for cross-dependencies between children ([775051c](https://github.com/SuperFlyTV/supertimeline/commit/775051c))


### BREAKING CHANGES

* when referring to an object within a group, now you get the absolute time, not the local time within that group



<a name="3.0.0"></a>
# [3.0.0](https://github.com/SuperFlyTV/supertimeline/compare/2.2.0...3.0.0) (2018-07-27)


### Bug Fixes

* bugfix for passing test "relative durations object order" ([31a886f](https://github.com/SuperFlyTV/supertimeline/commit/31a886f))
* refactored the tests, making them all run with the data reversed as well ([e823243](https://github.com/SuperFlyTV/supertimeline/commit/e823243))
* refactoring: object resolving iteration loop, so the same function is used inside groups as well as on root ([36fbb58](https://github.com/SuperFlyTV/supertimeline/commit/36fbb58))
* test incompatible with reversed data ([8fceadc](https://github.com/SuperFlyTV/supertimeline/commit/8fceadc))


### Features

* Add test to check order of objects in the source data has no affect on relative duration resolving ([2551789](https://github.com/SuperFlyTV/supertimeline/commit/2551789))
* added ability to reference objects between groups ([80bbb4a](https://github.com/SuperFlyTV/supertimeline/commit/80bbb4a))
* added test for cross-dependencies between children ([775051c](https://github.com/SuperFlyTV/supertimeline/commit/775051c))


### BREAKING CHANGES

* when referring to an object within a group, now you get the absolute time, not the local time within that group



<a name="2.2.0"></a>
# [2.2.0](https://github.com/SuperFlyTV/supertimeline/compare/2.1.0...2.2.0) (2018-07-05)


### Features

* implemented support for dynamic durations ([2b5c943](https://github.com/SuperFlyTV/supertimeline/commit/2b5c943))



<a name="2.1.0"></a>
# [2.1.0](https://github.com/SuperFlyTV/supertimeline/compare/2.0.3...2.1.0) (2018-07-02)


### Bug Fixes

* fix for failing test "keyframe in a grouped object" ([f80ed3d](https://github.com/SuperFlyTV/supertimeline/commit/f80ed3d))
* fix for failing test test: "test group with duration and infinite child" ([79d2b0e](https://github.com/SuperFlyTV/supertimeline/commit/79d2b0e))
* updated test ([2207624](https://github.com/SuperFlyTV/supertimeline/commit/2207624))


### Features

* Add test for duration set only on group, not child ([d22d1ec](https://github.com/SuperFlyTV/supertimeline/commit/d22d1ec))



<a name="2.0.3"></a>
## [2.0.3](https://github.com/SuperFlyTV/supertimeline/compare/2.0.2...2.0.3) (2018-06-15)



<a name="2.0.2"></a>
## [2.0.2](https://github.com/SuperFlyTV/supertimeline/compare/2.0.1...2.0.2) (2018-06-14)



<a name="2.0.1"></a>
## [2.0.1](https://github.com/SuperFlyTV/supertimeline/compare/2.0.0...2.0.1) (2018-06-09)



<a name="2.0.0"></a>
# [2.0.0](https://github.com/SuperFlyTV/supertimeline/compare/1.0.317...2.0.0) (2018-06-09)


* Empty commit, to trigger breaking version bump ([9b2426e](https://github.com/SuperFlyTV/supertimeline/commit/9b2426e))


### BREAKING CHANGES

* some logic might have changed during the past months



<a name="1.0.317"></a>
## [1.0.317](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.316...v1.0.317) (2018-06-06)


### Bug Fixes

* set skip ci to prevent looping on release ([0589e6f](https://github.com/SuperFlyTV/supertimeline/commit/0589e6f))



<a name="1.0.316"></a>
## [1.0.316](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.315...v1.0.316) (2018-06-06)



<a name="1.0.315"></a>
## [1.0.315](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.314...v1.0.315) (2018-06-06)



<a name="1.0.314"></a>
## [1.0.314](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.313...v1.0.314) (2018-06-06)



<a name="1.0.313"></a>
## [1.0.313](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.312...v1.0.313) (2018-06-06)



<a name="1.0.312"></a>
## [1.0.312](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.311...v1.0.312) (2018-06-06)



<a name="1.0.311"></a>
## [1.0.311](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.310...v1.0.311) (2018-06-06)



<a name="1.0.310"></a>
## [1.0.310](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.309...v1.0.310) (2018-06-06)



<a name="1.0.309"></a>
## [1.0.309](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.308...v1.0.309) (2018-06-06)



<a name="1.0.308"></a>
## [1.0.308](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.307...v1.0.308) (2018-06-06)



<a name="1.0.307"></a>
## [1.0.307](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.306...v1.0.307) (2018-06-06)



<a name="1.0.306"></a>
## [1.0.306](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.305...v1.0.306) (2018-06-06)



<a name="1.0.305"></a>
## [1.0.305](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.304...v1.0.305) (2018-06-06)



<a name="1.0.304"></a>
## [1.0.304](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.303...v1.0.304) (2018-06-06)



<a name="1.0.303"></a>
## [1.0.303](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.302...v1.0.303) (2018-06-06)



<a name="1.0.302"></a>
## [1.0.302](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.301...v1.0.302) (2018-06-06)



<a name="1.0.301"></a>
## [1.0.301](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.300...v1.0.301) (2018-06-06)



<a name="1.0.300"></a>
## [1.0.300](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.299...v1.0.300) (2018-06-06)



<a name="1.0.299"></a>
## [1.0.299](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.298...v1.0.299) (2018-06-06)



<a name="1.0.298"></a>
## [1.0.298](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.297...v1.0.298) (2018-06-06)



<a name="1.0.297"></a>
## [1.0.297](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.296...v1.0.297) (2018-06-06)



<a name="1.0.296"></a>
## [1.0.296](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.295...v1.0.296) (2018-06-06)



<a name="1.0.295"></a>
## [1.0.295](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.294...v1.0.295) (2018-06-06)



<a name="1.0.294"></a>
## [1.0.294](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.293...v1.0.294) (2018-06-06)



<a name="1.0.293"></a>
## [1.0.293](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.292...v1.0.293) (2018-06-06)



<a name="1.0.292"></a>
## [1.0.292](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.291...v1.0.292) (2018-06-06)



<a name="1.0.291"></a>
## [1.0.291](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.290...v1.0.291) (2018-06-06)



<a name="1.0.290"></a>
## [1.0.290](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.289...v1.0.290) (2018-06-06)



<a name="1.0.289"></a>
## [1.0.289](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.288...v1.0.289) (2018-06-06)



<a name="1.0.288"></a>
## [1.0.288](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.287...v1.0.288) (2018-06-06)



<a name="1.0.287"></a>
## [1.0.287](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.286...v1.0.287) (2018-06-06)



<a name="1.0.286"></a>
## [1.0.286](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.285...v1.0.286) (2018-06-06)



<a name="1.0.285"></a>
## [1.0.285](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.284...v1.0.285) (2018-06-06)



<a name="1.0.284"></a>
## [1.0.284](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.283...v1.0.284) (2018-06-06)



<a name="1.0.283"></a>
## [1.0.283](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.282...v1.0.283) (2018-06-06)



<a name="1.0.282"></a>
## [1.0.282](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.281...v1.0.282) (2018-06-06)



<a name="1.0.281"></a>
## [1.0.281](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.280...v1.0.281) (2018-06-06)



<a name="1.0.280"></a>
## [1.0.280](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.279...v1.0.280) (2018-06-06)



<a name="1.0.279"></a>
## [1.0.279](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.278...v1.0.279) (2018-06-06)



<a name="1.0.278"></a>
## [1.0.278](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.277...v1.0.278) (2018-06-06)



<a name="1.0.277"></a>
## [1.0.277](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.276...v1.0.277) (2018-06-06)



<a name="1.0.276"></a>
## [1.0.276](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.275...v1.0.276) (2018-06-06)



<a name="1.0.275"></a>
## [1.0.275](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.274...v1.0.275) (2018-06-06)



<a name="1.0.274"></a>
## [1.0.274](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.273...v1.0.274) (2018-06-06)



<a name="1.0.273"></a>
## [1.0.273](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.272...v1.0.273) (2018-06-06)



<a name="1.0.272"></a>
## [1.0.272](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.271...v1.0.272) (2018-06-06)



<a name="1.0.271"></a>
## [1.0.271](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.270...v1.0.271) (2018-06-06)



<a name="1.0.270"></a>
## [1.0.270](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.269...v1.0.270) (2018-06-06)



<a name="1.0.269"></a>
## [1.0.269](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.268...v1.0.269) (2018-06-06)



<a name="1.0.268"></a>
## [1.0.268](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.267...v1.0.268) (2018-06-06)



<a name="1.0.267"></a>
## [1.0.267](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.266...v1.0.267) (2018-06-06)



<a name="1.0.266"></a>
## [1.0.266](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.265...v1.0.266) (2018-06-06)



<a name="1.0.265"></a>
## [1.0.265](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.264...v1.0.265) (2018-06-06)



<a name="1.0.264"></a>
## [1.0.264](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.263...v1.0.264) (2018-06-06)



<a name="1.0.263"></a>
## [1.0.263](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.262...v1.0.263) (2018-06-06)



<a name="1.0.262"></a>
## [1.0.262](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.261...v1.0.262) (2018-06-06)



<a name="1.0.261"></a>
## [1.0.261](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.260...v1.0.261) (2018-06-06)



<a name="1.0.260"></a>
## [1.0.260](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.259...v1.0.260) (2018-06-06)



<a name="1.0.259"></a>
## [1.0.259](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.258...v1.0.259) (2018-06-06)



<a name="1.0.258"></a>
## [1.0.258](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.257...v1.0.258) (2018-06-06)



<a name="1.0.257"></a>
## [1.0.257](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.256...v1.0.257) (2018-06-06)



<a name="1.0.256"></a>
## [1.0.256](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.255...v1.0.256) (2018-06-06)



<a name="1.0.255"></a>
## [1.0.255](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.254...v1.0.255) (2018-06-06)



<a name="1.0.254"></a>
## [1.0.254](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.253...v1.0.254) (2018-06-06)



<a name="1.0.253"></a>
## [1.0.253](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.252...v1.0.253) (2018-06-06)



<a name="1.0.252"></a>
## [1.0.252](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.251...v1.0.252) (2018-06-06)



<a name="1.0.251"></a>
## [1.0.251](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.250...v1.0.251) (2018-06-06)



<a name="1.0.250"></a>
## [1.0.250](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.249...v1.0.250) (2018-06-06)



<a name="1.0.249"></a>
## [1.0.249](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.248...v1.0.249) (2018-06-06)



<a name="1.0.248"></a>
## [1.0.248](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.247...v1.0.248) (2018-06-06)



<a name="1.0.247"></a>
## [1.0.247](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.246...v1.0.247) (2018-06-06)



<a name="1.0.246"></a>
## [1.0.246](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.245...v1.0.246) (2018-06-06)



<a name="1.0.245"></a>
## [1.0.245](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.244...v1.0.245) (2018-06-06)



<a name="1.0.244"></a>
## [1.0.244](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.243...v1.0.244) (2018-06-06)



<a name="1.0.243"></a>
## [1.0.243](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.242...v1.0.243) (2018-06-06)



<a name="1.0.242"></a>
## [1.0.242](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.241...v1.0.242) (2018-06-06)



<a name="1.0.241"></a>
## [1.0.241](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.240...v1.0.241) (2018-06-06)



<a name="1.0.240"></a>
## [1.0.240](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.239...v1.0.240) (2018-06-06)



<a name="1.0.239"></a>
## [1.0.239](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.238...v1.0.239) (2018-06-06)



<a name="1.0.238"></a>
## [1.0.238](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.237...v1.0.238) (2018-06-06)



<a name="1.0.237"></a>
## [1.0.237](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.236...v1.0.237) (2018-06-06)



<a name="1.0.236"></a>
## [1.0.236](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.235...v1.0.236) (2018-06-06)



<a name="1.0.235"></a>
## [1.0.235](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.234...v1.0.235) (2018-06-06)



<a name="1.0.234"></a>
## [1.0.234](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.233...v1.0.234) (2018-06-06)



<a name="1.0.233"></a>
## [1.0.233](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.232...v1.0.233) (2018-06-06)



<a name="1.0.232"></a>
## [1.0.232](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.231...v1.0.232) (2018-06-06)



<a name="1.0.231"></a>
## [1.0.231](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.230...v1.0.231) (2018-06-06)



<a name="1.0.230"></a>
## [1.0.230](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.229...v1.0.230) (2018-06-06)



<a name="1.0.229"></a>
## [1.0.229](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.228...v1.0.229) (2018-06-06)



<a name="1.0.228"></a>
## [1.0.228](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.227...v1.0.228) (2018-06-06)



<a name="1.0.227"></a>
## [1.0.227](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.226...v1.0.227) (2018-06-06)



<a name="1.0.226"></a>
## [1.0.226](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.225...v1.0.226) (2018-06-06)



<a name="1.0.225"></a>
## [1.0.225](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.224...v1.0.225) (2018-06-06)



<a name="1.0.224"></a>
## [1.0.224](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.223...v1.0.224) (2018-06-06)



<a name="1.0.223"></a>
## [1.0.223](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.222...v1.0.223) (2018-06-06)



<a name="1.0.222"></a>
## [1.0.222](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.221...v1.0.222) (2018-06-06)



<a name="1.0.221"></a>
## [1.0.221](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.220...v1.0.221) (2018-06-06)



<a name="1.0.220"></a>
## [1.0.220](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.219...v1.0.220) (2018-06-06)



<a name="1.0.219"></a>
## [1.0.219](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.218...v1.0.219) (2018-06-06)



<a name="1.0.218"></a>
## [1.0.218](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.217...v1.0.218) (2018-06-06)



<a name="1.0.217"></a>
## [1.0.217](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.216...v1.0.217) (2018-06-06)



<a name="1.0.216"></a>
## [1.0.216](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.215...v1.0.216) (2018-06-06)



<a name="1.0.215"></a>
## [1.0.215](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.214...v1.0.215) (2018-06-06)



<a name="1.0.214"></a>
## [1.0.214](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.213...v1.0.214) (2018-06-06)



<a name="1.0.213"></a>
## [1.0.213](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.212...v1.0.213) (2018-06-06)



<a name="1.0.212"></a>
## [1.0.212](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.211...v1.0.212) (2018-06-06)



<a name="1.0.211"></a>
## [1.0.211](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.210...v1.0.211) (2018-06-06)



<a name="1.0.210"></a>
## [1.0.210](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.209...v1.0.210) (2018-06-06)



<a name="1.0.209"></a>
## [1.0.209](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.208...v1.0.209) (2018-06-06)



<a name="1.0.208"></a>
## [1.0.208](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.207...v1.0.208) (2018-06-06)



<a name="1.0.207"></a>
## [1.0.207](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.206...v1.0.207) (2018-06-06)



<a name="1.0.206"></a>
## [1.0.206](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.205...v1.0.206) (2018-06-06)



<a name="1.0.205"></a>
## [1.0.205](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.204...v1.0.205) (2018-06-06)



<a name="1.0.204"></a>
## [1.0.204](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.203...v1.0.204) (2018-06-06)



<a name="1.0.203"></a>
## [1.0.203](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.202...v1.0.203) (2018-06-06)



<a name="1.0.202"></a>
## [1.0.202](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.201...v1.0.202) (2018-06-06)



<a name="1.0.201"></a>
## [1.0.201](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.200...v1.0.201) (2018-06-06)



<a name="1.0.200"></a>
## [1.0.200](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.199...v1.0.200) (2018-06-06)



<a name="1.0.199"></a>
## [1.0.199](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.198...v1.0.199) (2018-06-06)



<a name="1.0.198"></a>
## [1.0.198](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.197...v1.0.198) (2018-06-06)



<a name="1.0.197"></a>
## [1.0.197](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.196...v1.0.197) (2018-06-06)



<a name="1.0.196"></a>
## [1.0.196](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.195...v1.0.196) (2018-06-06)



<a name="1.0.195"></a>
## [1.0.195](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.194...v1.0.195) (2018-06-06)



<a name="1.0.194"></a>
## [1.0.194](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.193...v1.0.194) (2018-06-06)



<a name="1.0.193"></a>
## [1.0.193](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.192...v1.0.193) (2018-06-06)



<a name="1.0.192"></a>
## [1.0.192](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.191...v1.0.192) (2018-06-06)



<a name="1.0.191"></a>
## [1.0.191](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.190...v1.0.191) (2018-06-06)



<a name="1.0.190"></a>
## [1.0.190](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.189...v1.0.190) (2018-06-06)



<a name="1.0.189"></a>
## [1.0.189](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.188...v1.0.189) (2018-06-06)



<a name="1.0.188"></a>
## [1.0.188](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.187...v1.0.188) (2018-06-06)



<a name="1.0.187"></a>
## [1.0.187](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.186...v1.0.187) (2018-06-06)



<a name="1.0.186"></a>
## [1.0.186](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.185...v1.0.186) (2018-06-06)



<a name="1.0.185"></a>
## [1.0.185](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.184...v1.0.185) (2018-06-06)



<a name="1.0.184"></a>
## [1.0.184](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.183...v1.0.184) (2018-06-06)



<a name="1.0.183"></a>
## [1.0.183](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.182...v1.0.183) (2018-06-06)



<a name="1.0.182"></a>
## [1.0.182](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.181...v1.0.182) (2018-06-06)



<a name="1.0.181"></a>
## [1.0.181](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.180...v1.0.181) (2018-06-06)



<a name="1.0.180"></a>
## [1.0.180](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.179...v1.0.180) (2018-06-06)



<a name="1.0.179"></a>
## [1.0.179](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.178...v1.0.179) (2018-06-06)



<a name="1.0.178"></a>
## [1.0.178](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.177...v1.0.178) (2018-06-06)



<a name="1.0.177"></a>
## [1.0.177](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.176...v1.0.177) (2018-06-06)



<a name="1.0.176"></a>
## [1.0.176](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.175...v1.0.176) (2018-06-06)



<a name="1.0.175"></a>
## [1.0.175](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.174...v1.0.175) (2018-06-06)



<a name="1.0.174"></a>
## [1.0.174](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.173...v1.0.174) (2018-06-06)



<a name="1.0.173"></a>
## [1.0.173](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.172...v1.0.173) (2018-06-06)



<a name="1.0.172"></a>
## [1.0.172](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.171...v1.0.172) (2018-06-06)



<a name="1.0.171"></a>
## [1.0.171](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.170...v1.0.171) (2018-06-06)



<a name="1.0.170"></a>
## [1.0.170](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.169...v1.0.170) (2018-06-06)



<a name="1.0.169"></a>
## [1.0.169](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.168...v1.0.169) (2018-06-06)



<a name="1.0.168"></a>
## [1.0.168](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.167...v1.0.168) (2018-06-06)



<a name="1.0.167"></a>
## [1.0.167](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.166...v1.0.167) (2018-06-06)



<a name="1.0.166"></a>
## [1.0.166](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.165...v1.0.166) (2018-06-06)



<a name="1.0.165"></a>
## [1.0.165](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.164...v1.0.165) (2018-06-06)



<a name="1.0.164"></a>
## [1.0.164](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.163...v1.0.164) (2018-06-06)



<a name="1.0.163"></a>
## [1.0.163](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.162...v1.0.163) (2018-06-05)



<a name="1.0.162"></a>
## [1.0.162](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.161...v1.0.162) (2018-06-05)



<a name="1.0.161"></a>
## [1.0.161](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.160...v1.0.161) (2018-06-05)



<a name="1.0.160"></a>
## [1.0.160](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.159...v1.0.160) (2018-06-05)



<a name="1.0.159"></a>
## [1.0.159](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.158...v1.0.159) (2018-06-05)



<a name="1.0.158"></a>
## [1.0.158](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.157...v1.0.158) (2018-06-05)



<a name="1.0.157"></a>
## [1.0.157](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.156...v1.0.157) (2018-06-05)



<a name="1.0.156"></a>
## [1.0.156](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.155...v1.0.156) (2018-06-05)



<a name="1.0.155"></a>
## [1.0.155](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.154...v1.0.155) (2018-06-05)



<a name="1.0.154"></a>
## [1.0.154](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.153...v1.0.154) (2018-06-05)



<a name="1.0.153"></a>
## [1.0.153](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.152...v1.0.153) (2018-06-05)



<a name="1.0.152"></a>
## [1.0.152](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.151...v1.0.152) (2018-06-05)



<a name="1.0.151"></a>
## [1.0.151](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.150...v1.0.151) (2018-06-05)



<a name="1.0.150"></a>
## [1.0.150](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.149...v1.0.150) (2018-06-05)



<a name="1.0.149"></a>
## [1.0.149](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.148...v1.0.149) (2018-06-05)



<a name="1.0.148"></a>
## [1.0.148](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.147...v1.0.148) (2018-06-05)



<a name="1.0.147"></a>
## [1.0.147](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.146...v1.0.147) (2018-06-05)



<a name="1.0.146"></a>
## [1.0.146](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.145...v1.0.146) (2018-06-05)



<a name="1.0.145"></a>
## [1.0.145](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.144...v1.0.145) (2018-06-05)



<a name="1.0.144"></a>
## [1.0.144](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.143...v1.0.144) (2018-06-05)



<a name="1.0.143"></a>
## [1.0.143](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.142...v1.0.143) (2018-06-05)



<a name="1.0.142"></a>
## [1.0.142](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.141...v1.0.142) (2018-06-05)



<a name="1.0.141"></a>
## [1.0.141](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.140...v1.0.141) (2018-06-05)



<a name="1.0.140"></a>
## [1.0.140](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.139...v1.0.140) (2018-06-05)



<a name="1.0.139"></a>
## [1.0.139](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.138...v1.0.139) (2018-06-05)



<a name="1.0.138"></a>
## [1.0.138](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.137...v1.0.138) (2018-06-05)



<a name="1.0.137"></a>
## [1.0.137](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.136...v1.0.137) (2018-06-05)



<a name="1.0.136"></a>
## [1.0.136](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.135...v1.0.136) (2018-06-05)



<a name="1.0.135"></a>
## [1.0.135](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.134...v1.0.135) (2018-06-05)



<a name="1.0.134"></a>
## [1.0.134](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.133...v1.0.134) (2018-06-05)



<a name="1.0.133"></a>
## [1.0.133](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.132...v1.0.133) (2018-06-05)



<a name="1.0.132"></a>
## [1.0.132](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.131...v1.0.132) (2018-06-05)



<a name="1.0.131"></a>
## [1.0.131](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.130...v1.0.131) (2018-06-05)



<a name="1.0.130"></a>
## [1.0.130](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.129...v1.0.130) (2018-06-05)



<a name="1.0.129"></a>
## [1.0.129](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.128...v1.0.129) (2018-06-05)



<a name="1.0.128"></a>
## [1.0.128](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.127...v1.0.128) (2018-06-05)



<a name="1.0.127"></a>
## [1.0.127](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.126...v1.0.127) (2018-06-05)



<a name="1.0.126"></a>
## [1.0.126](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.125...v1.0.126) (2018-06-05)



<a name="1.0.125"></a>
## [1.0.125](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.124...v1.0.125) (2018-06-05)



<a name="1.0.124"></a>
## [1.0.124](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.123...v1.0.124) (2018-06-05)



<a name="1.0.123"></a>
## [1.0.123](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.122...v1.0.123) (2018-06-05)



<a name="1.0.122"></a>
## [1.0.122](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.121...v1.0.122) (2018-06-05)



<a name="1.0.121"></a>
## [1.0.121](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.120...v1.0.121) (2018-06-05)



<a name="1.0.120"></a>
## [1.0.120](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.119...v1.0.120) (2018-06-05)



<a name="1.0.119"></a>
## [1.0.119](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.118...v1.0.119) (2018-06-05)



<a name="1.0.118"></a>
## [1.0.118](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.117...v1.0.118) (2018-06-05)



<a name="1.0.117"></a>
## [1.0.117](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.116...v1.0.117) (2018-06-05)



<a name="1.0.116"></a>
## [1.0.116](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.115...v1.0.116) (2018-06-05)



<a name="1.0.115"></a>
## [1.0.115](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.114...v1.0.115) (2018-06-05)



<a name="1.0.114"></a>
## [1.0.114](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.113...v1.0.114) (2018-06-05)



<a name="1.0.113"></a>
## [1.0.113](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.112...v1.0.113) (2018-06-05)



<a name="1.0.112"></a>
## [1.0.112](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.111...v1.0.112) (2018-06-05)



<a name="1.0.111"></a>
## [1.0.111](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.110...v1.0.111) (2018-06-05)



<a name="1.0.110"></a>
## [1.0.110](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.109...v1.0.110) (2018-06-05)



<a name="1.0.109"></a>
## [1.0.109](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.108...v1.0.109) (2018-06-05)



<a name="1.0.108"></a>
## [1.0.108](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.107...v1.0.108) (2018-06-05)



<a name="1.0.107"></a>
## [1.0.107](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.106...v1.0.107) (2018-06-05)



<a name="1.0.106"></a>
## [1.0.106](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.105...v1.0.106) (2018-06-05)



<a name="1.0.105"></a>
## [1.0.105](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.104...v1.0.105) (2018-06-05)



<a name="1.0.104"></a>
## [1.0.104](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.103...v1.0.104) (2018-06-05)



<a name="1.0.103"></a>
## [1.0.103](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.102...v1.0.103) (2018-06-05)



<a name="1.0.102"></a>
## [1.0.102](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.101...v1.0.102) (2018-06-05)



<a name="1.0.101"></a>
## [1.0.101](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.100...v1.0.101) (2018-06-05)



<a name="1.0.100"></a>
## [1.0.100](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.99...v1.0.100) (2018-06-05)



<a name="1.0.99"></a>
## [1.0.99](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.98...v1.0.99) (2018-06-05)



<a name="1.0.98"></a>
## [1.0.98](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.97...v1.0.98) (2018-06-05)



<a name="1.0.97"></a>
## [1.0.97](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.96...v1.0.97) (2018-06-05)



<a name="1.0.96"></a>
## [1.0.96](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.95...v1.0.96) (2018-06-05)



<a name="1.0.95"></a>
## [1.0.95](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.94...v1.0.95) (2018-06-05)



<a name="1.0.94"></a>
## [1.0.94](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.93...v1.0.94) (2018-06-05)



<a name="1.0.93"></a>
## [1.0.93](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.92...v1.0.93) (2018-06-05)



<a name="1.0.92"></a>
## [1.0.92](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.91...v1.0.92) (2018-06-05)



<a name="1.0.91"></a>
## [1.0.91](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.90...v1.0.91) (2018-06-05)



<a name="1.0.90"></a>
## [1.0.90](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.89...v1.0.90) (2018-06-05)



<a name="1.0.89"></a>
## [1.0.89](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.88...v1.0.89) (2018-06-05)



<a name="1.0.88"></a>
## [1.0.88](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.87...v1.0.88) (2018-06-05)



<a name="1.0.87"></a>
## [1.0.87](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.86...v1.0.87) (2018-06-05)



<a name="1.0.86"></a>
## [1.0.86](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.85...v1.0.86) (2018-06-05)



<a name="1.0.85"></a>
## [1.0.85](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.84...v1.0.85) (2018-06-05)



<a name="1.0.84"></a>
## [1.0.84](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.83...v1.0.84) (2018-06-05)



<a name="1.0.83"></a>
## [1.0.83](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.82...v1.0.83) (2018-06-05)



<a name="1.0.82"></a>
## [1.0.82](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.81...v1.0.82) (2018-06-05)



<a name="1.0.81"></a>
## [1.0.81](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.80...v1.0.81) (2018-06-05)



<a name="1.0.80"></a>
## [1.0.80](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.79...v1.0.80) (2018-06-05)



<a name="1.0.79"></a>
## [1.0.79](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.78...v1.0.79) (2018-06-05)



<a name="1.0.78"></a>
## [1.0.78](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.77...v1.0.78) (2018-06-05)



<a name="1.0.77"></a>
## [1.0.77](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.76...v1.0.77) (2018-06-05)



<a name="1.0.76"></a>
## [1.0.76](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.75...v1.0.76) (2018-06-05)



<a name="1.0.75"></a>
## [1.0.75](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.74...v1.0.75) (2018-06-05)



<a name="1.0.74"></a>
## [1.0.74](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.73...v1.0.74) (2018-06-05)



<a name="1.0.73"></a>
## [1.0.73](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.72...v1.0.73) (2018-06-05)



<a name="1.0.72"></a>
## [1.0.72](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.71...v1.0.72) (2018-06-05)



<a name="1.0.71"></a>
## [1.0.71](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.70...v1.0.71) (2018-06-05)



<a name="1.0.70"></a>
## [1.0.70](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.69...v1.0.70) (2018-06-05)



<a name="1.0.69"></a>
## [1.0.69](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.68...v1.0.69) (2018-06-05)



<a name="1.0.68"></a>
## [1.0.68](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.67...v1.0.68) (2018-06-05)



<a name="1.0.67"></a>
## [1.0.67](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.66...v1.0.67) (2018-06-05)



<a name="1.0.66"></a>
## [1.0.66](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.65...v1.0.66) (2018-06-05)



<a name="1.0.65"></a>
## [1.0.65](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.64...v1.0.65) (2018-06-05)



<a name="1.0.64"></a>
## [1.0.64](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.63...v1.0.64) (2018-06-05)



<a name="1.0.63"></a>
## [1.0.63](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.62...v1.0.63) (2018-06-05)



<a name="1.0.62"></a>
## [1.0.62](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.61...v1.0.62) (2018-06-05)



<a name="1.0.61"></a>
## [1.0.61](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.60...v1.0.61) (2018-06-05)



<a name="1.0.60"></a>
## [1.0.60](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.59...v1.0.60) (2018-06-05)



<a name="1.0.59"></a>
## [1.0.59](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.58...v1.0.59) (2018-06-05)



<a name="1.0.58"></a>
## [1.0.58](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.57...v1.0.58) (2018-06-05)



<a name="1.0.57"></a>
## [1.0.57](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.56...v1.0.57) (2018-06-05)



<a name="1.0.56"></a>
## [1.0.56](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.55...v1.0.56) (2018-06-05)



<a name="1.0.55"></a>
## [1.0.55](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.54...v1.0.55) (2018-06-05)



<a name="1.0.54"></a>
## [1.0.54](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.53...v1.0.54) (2018-06-05)



<a name="1.0.53"></a>
## [1.0.53](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.52...v1.0.53) (2018-06-05)



<a name="1.0.52"></a>
## [1.0.52](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.51...v1.0.52) (2018-06-05)



<a name="1.0.51"></a>
## [1.0.51](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.50...v1.0.51) (2018-06-05)



<a name="1.0.50"></a>
## [1.0.50](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.49...v1.0.50) (2018-06-05)



<a name="1.0.49"></a>
## [1.0.49](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.48...v1.0.49) (2018-06-05)



<a name="1.0.48"></a>
## [1.0.48](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.47...v1.0.48) (2018-06-05)



<a name="1.0.47"></a>
## [1.0.47](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.46...v1.0.47) (2018-06-05)



<a name="1.0.46"></a>
## [1.0.46](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.45...v1.0.46) (2018-06-05)



<a name="1.0.45"></a>
## [1.0.45](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.44...v1.0.45) (2018-06-05)



<a name="1.0.44"></a>
## [1.0.44](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.43...v1.0.44) (2018-06-05)



<a name="1.0.43"></a>
## [1.0.43](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.42...v1.0.43) (2018-06-05)



<a name="1.0.42"></a>
## [1.0.42](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.41...v1.0.42) (2018-06-05)



<a name="1.0.41"></a>
## [1.0.41](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.40...v1.0.41) (2018-06-05)



<a name="1.0.40"></a>
## [1.0.40](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.39...v1.0.40) (2018-06-05)



<a name="1.0.39"></a>
## [1.0.39](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.38...v1.0.39) (2018-06-05)



<a name="1.0.38"></a>
## [1.0.38](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.37...v1.0.38) (2018-06-05)



<a name="1.0.37"></a>
## [1.0.37](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.36...v1.0.37) (2018-06-05)



<a name="1.0.36"></a>
## [1.0.36](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.35...v1.0.36) (2018-06-05)



<a name="1.0.35"></a>
## [1.0.35](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.34...v1.0.35) (2018-06-05)



<a name="1.0.34"></a>
## [1.0.34](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.33...v1.0.34) (2018-06-05)



<a name="1.0.33"></a>
## [1.0.33](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.32...v1.0.33) (2018-06-05)



<a name="1.0.32"></a>
## [1.0.32](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.31...v1.0.32) (2018-06-05)



<a name="1.0.31"></a>
## [1.0.31](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.30...v1.0.31) (2018-06-05)



<a name="1.0.30"></a>
## [1.0.30](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.29...v1.0.30) (2018-06-05)



<a name="1.0.29"></a>
## [1.0.29](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.28...v1.0.29) (2018-06-05)



<a name="1.0.28"></a>
## [1.0.28](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.27...v1.0.28) (2018-06-05)



<a name="1.0.27"></a>
## [1.0.27](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.26...v1.0.27) (2018-06-05)



<a name="1.0.26"></a>
## [1.0.26](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.25...v1.0.26) (2018-06-05)



<a name="1.0.25"></a>
## [1.0.25](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.24...v1.0.25) (2018-06-05)



<a name="1.0.24"></a>
## [1.0.24](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.23...v1.0.24) (2018-06-05)



<a name="1.0.23"></a>
## [1.0.23](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.22...v1.0.23) (2018-06-05)



<a name="1.0.22"></a>
## [1.0.22](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.21...v1.0.22) (2018-06-05)



<a name="1.0.21"></a>
## [1.0.21](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.20...v1.0.21) (2018-06-05)



<a name="1.0.20"></a>
## [1.0.20](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.19...v1.0.20) (2018-06-05)



<a name="1.0.19"></a>
## [1.0.19](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.18...v1.0.19) (2018-06-05)



<a name="1.0.18"></a>
## [1.0.18](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.17...v1.0.18) (2018-06-05)



<a name="1.0.17"></a>
## [1.0.17](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.16...v1.0.17) (2018-06-05)



<a name="1.0.16"></a>
## [1.0.16](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.15...v1.0.16) (2018-06-05)



<a name="1.0.15"></a>
## [1.0.15](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.14...v1.0.15) (2018-06-05)



<a name="1.0.14"></a>
## [1.0.14](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.13...v1.0.14) (2018-06-05)



<a name="1.0.13"></a>
## [1.0.13](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.12...v1.0.13) (2018-06-05)



<a name="1.0.12"></a>
## [1.0.12](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.11...v1.0.12) (2018-06-05)



<a name="1.0.11"></a>
## [1.0.11](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.10...v1.0.11) (2018-06-05)



<a name="1.0.10"></a>
## [1.0.10](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.9...v1.0.10) (2018-06-05)



<a name="1.0.9"></a>
## [1.0.9](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.8...v1.0.9) (2018-06-05)



<a name="1.0.8"></a>
## [1.0.8](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.7...v1.0.8) (2018-06-05)



<a name="1.0.7"></a>
## [1.0.7](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.6...v1.0.7) (2018-06-05)



<a name="1.0.6"></a>
## [1.0.6](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.5...v1.0.6) (2018-06-05)



<a name="1.0.5"></a>
## [1.0.5](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.4...v1.0.5) (2018-06-05)



<a name="1.0.4"></a>
## [1.0.4](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.3...v1.0.4) (2018-06-05)



<a name="1.0.3"></a>
## [1.0.3](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.2...v1.0.3) (2018-06-05)



<a name="1.0.2"></a>
## [1.0.2](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.1...v1.0.2) (2018-06-05)



<a name="1.0.1"></a>
## [1.0.1](https://github.com/SuperFlyTV/supertimeline/compare/v1.0.0...v1.0.1) (2018-06-05)



<a name="1.0.0"></a>
# 1.0.0 (2018-06-05)


### Bug Fixes

* add basic circleci config ([0ce739b](https://github.com/SuperFlyTV/supertimeline/commit/0ce739b))
* add circleCI badge ([4b508ff](https://github.com/SuperFlyTV/supertimeline/commit/4b508ff))
* add ssh fingerprint ([35cf4e0](https://github.com/SuperFlyTV/supertimeline/commit/35cf4e0))
* adding --detectOpenHandles to tests ([7d5b056](https://github.com/SuperFlyTV/supertimeline/commit/7d5b056))
* seemingly a syntax error ([d32fbf8](https://github.com/SuperFlyTV/supertimeline/commit/d32fbf8))
* set correct company name ([205dbd7](https://github.com/SuperFlyTV/supertimeline/commit/205dbd7))
* unify across libs ([eeebfcb](https://github.com/SuperFlyTV/supertimeline/commit/eeebfcb))
* update configs ([1ac3bd9](https://github.com/SuperFlyTV/supertimeline/commit/1ac3bd9))
* update ignores ([a70866e](https://github.com/SuperFlyTV/supertimeline/commit/a70866e))
* update to circleCI enabled package.json ([3a9389e](https://github.com/SuperFlyTV/supertimeline/commit/3a9389e))
* update typescript with better types and more ([6607bad](https://github.com/SuperFlyTV/supertimeline/commit/6607bad))


### Features

* add .github foler ([5d793b9](https://github.com/SuperFlyTV/supertimeline/commit/5d793b9))
* Implemented into typescript ([70b6760](https://github.com/SuperFlyTV/supertimeline/commit/70b6760))
* linted the whole codebase to comply with tslint, added support for repeating groups within repeating groups, added a bunch of tests ([4189cc1](https://github.com/SuperFlyTV/supertimeline/commit/4189cc1))


### BREAKING CHANGES

* New API, exports are done differently
