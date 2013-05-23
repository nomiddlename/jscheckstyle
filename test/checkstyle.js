var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    jscheckstyle = require('../lib/jscheckstyle');

function given(inputFile, expectedOutput) {
    var context = {};
    context['(' + inputFile + ') '] = {
        topic: function() {
            return jscheckstyle.analyse('/pants/file1.js', fs.readFileSync(__dirname + '/fixtures/' + inputFile, 'utf8'));
        }
    };
    context['(' + inputFile + ') ']['passed to the renderer'] = expectedOutput;
    return context;
}

function expect(outputFile) {
    var context = {
        topic: function(results) {
            return jscheckstyle.renderers.checkstyle(results);
        }
    };
    context['the output should match ' + outputFile] = function(output) {
        assert.equal(output, fs.readFileSync(__dirname + '/fixtures/' + outputFile, 'utf8'));
    };
    return context;
}

vows.describe("checkstyle renderer").addBatch({
    'should be exported as a command line option': function() {
        assert.equal(jscheckstyle.renderers.checkstyle, jscheckstyle.renderers['--checkstyle']);
    },

    'with simple input': given('simple.js', expect('no-errors.xml')),
    'with a cyclomatic complexity violation': given('complex-function.js', expect('complex-output.xml')),
    'with a function length violation': given('long-function.js', expect('long-output.xml')),
    'with a configured function length violation': given('configured-long-function.js', expect('configured-long-output.xml')),
    'with a number of arguments violation': given('too-many-arguments.js', expect('too-many-arguments-output.xml')),
    'with multiple violations in a single function': given('lots-of-args-and-long.js', expect('lots-of-args-and-long-output.xml')),
    'module.exports should not trigger function length violation': given('a-long-module.js', expect('no-errors.xml')),
    'module.exports should trigger number of arguments violation': given('a-module-function.js', expect('module-arguments.xml')),

    'violations only': {
        'when no rules are broken': {
            topic: jscheckstyle.violationsOnly([{
                filename: "file1.js",
                results: [
                    { lineStart: 1, shortName: "cheese", lines: 5, complexity: 1, ins: 1 },
                    { lineStart: 10, shortName: "biscuits", lines: 2, complexity: 5, ins: 0 }
                ]
            }]),
            'should return an empty array': function(results) {
                assert.lengthOf(results, 0);
            }
        },
        'when one rule is broken': {
            topic: jscheckstyle.violationsOnly([{
                filename: "file1.js",
                results: [
                    { lineStart: 1, shortName: "cheese", lines:5, complexity:15, ins: 1 },
                    { lineStart: 10, shortName: "biscuits", lines: 2, complexity: 5, ins: 0 }
                ]
            }]),
            'should return an array with one result': function(results) {
                assert.deepEqual(results, [{
                    filename: "file1.js",
                    results: [
                        { lineStart:1,
                          shortName: "cheese",
                          lines: 5,
                          complexity: 15,
                          ins: 1,
                          violations: [{
                              source: "CyclomaticComplexity",
                              message: "cheese has a cyclomatic complexity of 15, maximum should be 10"
                          }]
                        }
                    ]
                }]);
            }
        },
        'when one rule is broken in two functions': {
            topic: jscheckstyle.violationsOnly([{
                filename: "file1.js",
                results: [
                    { lineStart: 1, shortName: "cheese", lines:5, complexity:15, ins: 1 },
                    { lineStart: 10, shortName: "biscuits", lines: 2, complexity: 15, ins: 0 }
                ]
            }]),
            'should return an array with two results': function(results) {
                assert.deepEqual(
                    results,
                    [{ filename: "file1.js", results: [
                        { lineStart:1, shortName: "cheese", lines: 5, complexity: 15, ins: 1, violations: [{
                              source: "CyclomaticComplexity",
                              message: "cheese has a cyclomatic complexity of 15, maximum should be 10"
                          }] },
                        { lineStart:10, shortName: "biscuits", lines: 2, complexity: 15, ins: 0, violations: [{
                              source: "CyclomaticComplexity",
                              message: "biscuits has a cyclomatic complexity of 15, maximum should be 10"
                          }] }
                    ] }]
                );
            }
        },
        'when two rules are broken in one function': {
            topic: jscheckstyle.violationsOnly([{
                filename: "file1.js",
                results: [
                    { lineStart: 1, shortName: "cheese", lines:5, complexity:15, ins: 8 },
                    { lineStart: 10, shortName: "biscuits", lines: 2, complexity: 1, ins: 0 }
                ]
            }]),
            'should return an array with one result and two violations': function(results) {
                assert.deepEqual(
                    results,
                    [{ filename: "file1.js", results: [
                        { lineStart:1, shortName: "cheese", lines: 5, complexity: 15, ins: 8, violations: [
                            { source: "CyclomaticComplexity",
                              message: "cheese has a cyclomatic complexity of 15, maximum should be 10"
                            },
                            { source: "NumberOfArguments",
                              message: "cheese has 8 arguments, maximum allowed is 5"
                            }
                        ]}
                    ] }]
                );
            }
        }
    }
}).exportTo(module);
