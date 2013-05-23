var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    analyser = require('../lib/analyser');

vows.describe('analyser').addBatch({
    'given a single function': {
        topic: analyser.analyse('function cheese(type) {\n return "gouda";\n }'),
        'should return an array': function(result) {
            assert.isArray(result);
        },
        'result should be of length 1': function(result) {
            assert.lengthOf(result, 1);
        },
        'result': {
            topic: function(results) {
                return results[0];
            },
            'should have a shortName': function(result) {
                assert.equal(result.shortName, 'cheese');
            },
            'should have a lineStart': function(result) {
                assert.equal(result.lineStart, 1);
            },
            'should have a number of lines': function(result) {
                assert.equal(result.lines, 3);
            },
            'should have a number of arguments': function(result) {
                assert.equal(result.ins, 1);
            },
            'should have a cyclomatic complexity': function(result) {
                assert.equal(result.complexity, 2);
            }
        }
    },
    'given an anonymous function': {
        topic: analyser.analyse('cheese.map(function(a) { return a+1; })'),
        'result': {
            topic: function(results) {
                return results[0];
            },
            'should have a shortName': function(result) {
                assert.equal(result.shortName, 'anonymous');
            }
        }
    },
    'given two functions': {
        topic: analyser.analyse('function cheese(type) {\n return "gouda";\n}\nfunction pants() {\n return "on";\n }'),
        'result should be of length 2': function(result) {
            assert.lengthOf(result, 2);
        },
        'first result': {
            topic: function(results) {
                return results[0];
            },
            'should have the correct properties': function(result) {
              assert.deepEqual(result, { shortName: 'cheese', lineStart: 1, lines: 3, ins: 1, complexity: 2, config: {} });
            }
        },
        'second result': {
            topic: function(results) {
                return results[1];
            },
            'should have the correct properties': function(result) {
              assert.deepEqual(result, { shortName: 'pants', lineStart: 4, lines: 3, ins: 0, complexity: 2, config: {} });
            }
        }
    },
    'given a complex function': {
        topic: analyser.analyse(fs.readFileSync('test/fixtures/complex-function.js', 'utf8')),
        'first result should have a complexity of 12': function(result) {
            assert.equal(result[0].complexity, 12);
        }
    },
    'given a function declared as a global variable': {
        topic: analyser.analyse(fs.readFileSync('test/fixtures/a-long-module.js', 'utf8')),
        'first result should have a name of module.exports': function(result) {
            assert.equal(result[0].shortName, 'module.exports');
        }
    },
    'given a function declared as a local variable': {
        topic: analyser.analyse(fs.readFileSync('test/fixtures/a-local-function.js', 'utf8')),
        'first result should have a name of cheese': function(result) {
            assert.equal(result[0].shortName, 'cheese');
        }
    },
  'given a function with "functionLength" comment preceding': {
    topic: analyser.analyse('/* @jscheckstyle.functionLength=7 */ function func1() {}'),
    'first result should have a config structure with functionLength=7': function(result) {
      assert.equal(result[0].shortName, 'func1');
      assert.equal(result[0].config.functionLength, 7);
    }
  },

  'given a function with "cyclomaticComplexity" comment preceding': {
    topic: analyser.analyse('// @jscheckstyle.cyclomaticComplexity=7\nfunction func1() {}'),
    'first result should have a config structure with cyclomaticComplexity=7': function(result) {
      assert.equal(result[0].shortName, 'func1');
      assert.equal(result[0].config.cyclomaticComplexity, 7);
    }
  },

  'given a function with "numberOfArguments" comment preceding': {
    topic: analyser.analyse('// @jscheckstyle.numberOfArguments=7\nfunction func1() {}'),
    'first result should have a config structure with numberOfArguments=7': function(result) {
      assert.equal(result[0].shortName, 'func1');
      assert.equal(result[0].config.numberOfArguments, 7);
    }
  }

}).exportTo(module);
