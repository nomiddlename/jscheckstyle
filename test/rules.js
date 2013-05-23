var vows = require('vows'),
    assert = require('assert'),
    rules = require('../lib/rules');

vows.describe('rules').addBatch({
    'all rules': {
        topic: rules,
        'there should be at least one': function(rules) {
            assert.greater(rules.length, 0);
        },
        'should have a name': function(rules) {
            rules.forEach(function(rule) {
                assert.isString(rule.name);
            });
        },
        'should have a check function': function(rules) {
            rules.forEach(function(rule) {
                assert.isFunction(rule.check);
            });
        },
        'should be an instance of rules.Checker': function(rules) {
            rules.forEach(function(rule) {
                assert.instanceOf(rule, rules.Checker);
            });
        }
    },
    'Checker': {
        'with a dummy check function': {
            topic: new rules.Checker("Tester", function(toTest) { return toTest.shortName + " tested."; }),
            'should have a name': function(checker) {
                assert.equal(checker.name, "Tester");
            },
            'when passed parser results': {
                topic: function(checker) {
                    return checker.check([{ lineStart: 5, shortName: "cheese"}]);
                },
                'should return a list of violation objects': function(violations) {
                    assert.isArray(violations);
                    assert.lengthOf(violations, 1);
                    assert.deepEqual(violations, [
                        { lineStart: 5,
                          shortName: "cheese",
                          violations: [{
                              message: "cheese tested.",
                              source: "Tester"
                          }]
                        }
                    ]);
                }
            },
            'when passed lots of parser results': {
                topic: function(checker) {
                    return checker.check([
                        { lineStart: 1, shortName: "[[code]]" },
                        { lineStart: 5, shortName: "cheese" },
                        { lineStart: 10, shortName: "biscuits" }
                    ]);
                },
                'should filter out [[code]] for rules': function(violations) {
                    assert.deepEqual(violations.map(function(result) { return result.violations[0].message; }), [ "cheese tested.", "biscuits tested." ]);
                }
            },
            'when passed a result that already has violations': {
                topic: function(checker) {
                    return checker.check([
                        { lineStart: 1, shortName: "cheese", violations: [ { message: "aargh", source: "Aargher" }] }
                    ]);
                },
                'should add to violations list': function(violations) {
                    assert.deepEqual(violations, [{
                        lineStart: 1,
                        shortName: "cheese",
                        violations: [
                            { message: "aargh", source: "Aargher" },
                            { message: "cheese tested.", source: "Tester" }
                        ]
                    }]);
                }
            }
        }
    },
    'FunctionLength checker': {
        topic: rules.filter(function(rule) { return rule.name === "FunctionLength"; })[0],
        'when passed a function greater than 30 lines long': {
            topic: function(checker) {
                return checker.check([{ lineStart: 4, shortName: "cheese", lines: 50 }]);
            },
            'should return a violation': function(violations) {
                assert.deepEqual(violations, [{
                    lineStart:4,
                    shortName: "cheese",
                    lines: 50,
                    violations: [{
                        message: "cheese is 50 lines long, maximum allowed is 30",
                        source: "FunctionLength"
                    }]
                }]);
            }
        },
        'when passed a function less than 30 lines long': {
            topic: function(checker) {
                return checker.check([{ lineStart: 4, shortName: "cheese", lines: 20 }]);
            },
            'should return the original result with no violations': function(violations) {
                assert.deepEqual(violations, [{ lineStart: 4, shortName: "cheese", lines: 20 }]);
            }
        },
        'when passed a long module': {
            topic: function(checker) {
                return checker.check([
                    { lineStart: 1, shortName: "module.exports", lines: 50 },
                    { lineStart: 5, shortName: "shortFunction", lines: 10 },
                    { lineStart: 16, shortName: "longFunction", lines: 31 }
                ]);
            },
            'should ignore module.exports': function(violations) {
                assert.lengthOf(violations.filter(function(result) { return result.shortName === 'module.exports' && result.violations; }), 0);
            },
            'should not ignore the long function': function(violations) {
                assert.lengthOf(violations.filter(function(result) { return result.shortName === 'longFunction' && result.violations && result.violations.length === 1; }), 1);
            }
        },
        'when passed a function with configured functionLength limit': {
            topic: function(checker) {
                return checker.check([
                    { lineStart: 1, shortName: "module.exports", lines: 50, config: { functionLength: 40 } },
                    { lineStart: 5, shortName: "shortFunction", lines: 31, config: { functionLength: 40 } },
                    { lineStart: 16, shortName: "longFunction", lines: 41, config: { functionLength: 40 } }
                ]);
            },
            'should ignore module.exports': function(violations) {
                assert.lengthOf(violations.filter(function(result) { return result.shortName === 'module.exports' && result.violations; }), 0);
            },
            'should ignore the short function': function(violations) {
                assert.lengthOf(violations.filter(function(result) { return result.shortName === 'shortFunction' && result.violations; }), 0);
            },
            'should not ignore the long function': function(violations) {
                assert.lengthOf(violations.filter(function(result) { return result.shortName === 'longFunction' && result.violations && result.violations.length === 1; }), 1);
            }
        }

    },
    'NumberOfArguments checker': {
        topic: rules.filter(function(rule) { return rule.name === "NumberOfArguments"; })[0],
        'when passed a function with more than 5 arguments': {
            topic: function(checker) {
                return checker.check([{ lineStart:4, shortName: "cheese", ins: 15 }]);
            },
            'should return a violation': function(violations) {
                assert.deepEqual(violations, [{
                    lineStart: 4,
                    shortName: "cheese",
                    ins: 15,
                    violations: [{
                        message: "cheese has 15 arguments, maximum allowed is 5",
                        source: "NumberOfArguments"
                    }]
                }]);
            }
        },
        'when passed a function with less than 5 arguments': {
            topic: function(checker) {
                return checker.check([{ lineStart: 4, shortName: "cheese", ins: 2 }]);
            },
            'should return the original result with no violations': function(violations) {
                assert.deepEqual(violations, [{ lineStart: 4, shortName: "cheese", ins: 2 }]);
            }
        },
        'when passed a function with less than configured number of arguments': {
            topic: function(checker) {
                return checker.check([{ lineStart: 4, shortName: "cheese", ins: 7, config: { numberOfArguments: 10 } }]);
            },
            'should return the original result with no violations': function(violations) {
                assert.deepEqual(violations, [{ lineStart: 4, shortName: "cheese", ins: 7, config: { numberOfArguments: 10 } }]);
            }
        }

    },
    'CyclomaticComplexity checker': {
        topic: rules.filter(function(rule) { return rule.name === "CyclomaticComplexity"; })[0],
        'when passed a function with a cyclomatic complexity greater than 10': {
            topic: function(checker) {
                return checker.check([{ lineStart:4, shortName: "cheese", complexity: 50 }]);
            },
            'should return a violation': function(violations) {
                assert.deepEqual(violations, [{
                    lineStart: 4,
                    shortName: "cheese",
                    complexity: 50,
                    violations: [{
                        source: "CyclomaticComplexity",
                        message: "cheese has a cyclomatic complexity of 50, maximum should be 10"
                    }]
                }]);
            }
        },
        'when passed a function with a cyclomatic complexity less than 10': {
            topic: function(checker) {
                return checker.check([{ lineStart: 4, shortName: "cheese", complexity: 2 }]);
            },
            'should return the original result with no violations': function(violations) {
                assert.deepEqual(violations, [{ lineStart: 4, shortName: "cheese", complexity: 2 }]);
            }
        },
        'when passed a function with a cyclomatic complexity less than a configured limit': {
            topic: function(checker) {
              return checker.check([{ lineStart: 4, shortName: "cheese", complexity: 12, config: { cyclomaticComplexity: 15 } }]);
            },
            'should return the original result with no violations': function(violations) {
                assert.deepEqual(violations, [{ lineStart: 4, shortName: "cheese", complexity: 12, config: { cyclomaticComplexity: 15 } }]);
            }
        }

    }
}).exportTo(module);