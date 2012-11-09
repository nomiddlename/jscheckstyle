var vows = require('vows'),
    assert = require('assert'),
    sandbox = require('sandboxed-module'),
    Table = require('cli-table'),
    fakeF = {
        walkSync: function(arg, cb) {
            cb('dir1', '', ['file7.js', 'file8.js', 'file9.js']);
        }
    },
    fakeFS = function (filesProcessed) {
        return {
            existsSync: function(file) {
                return true;
            },
            readFileSync: function(file) {
                filesProcessed.push(file);
                return "var a=1";
            },
            statSync: function(arg) {
                return {
                    isDirectory: function() {
                        return (arg.match(/\.js$/)) ? false : true;
                    }
                };
            }
        };
    },
    fakeSys = function (cb) {
        return {
            puts: function(str) {
                if (cb) {
                    cb(null, str);
                }
            }
        };
    },
    fakeProcess = {
        exit: function(code) {
            assert.equal(code, 0);
        },
        cwd: function() {
            return 'foo/bar';
        }
    },
    filesProcessedShouldBe = function(expectedFiles) {
        return function(context) {
            context['should read all the files on the command line'] = function(output) {
                try {
                    var result = JSON.parse(output),
                    files = result.map(function(item) { return item.filename; });
                    assert.deepEqual(files, expectedFiles);
                } catch (e) {
                    //not json, so let's just search the output for each filename
                    expectedFiles.forEach(function(file) {
                        assert.includes(output, file);
                    });
                }
            };
        };
    },
    outputShouldBe = function(expectedOutput) {
        return function(context) {
            context['output should be valid'] = function(output) {
                expectedOutput(output);
            };
        };
    },
    validJSON = function(output) {
        assert.doesNotThrow(function() { JSON.parse(output); }, Error);
    },
    validHTML = function(output) {
        //there's probably a better way of verifying the output
        assert.match(output, /<html>.*<\/html>/);
    },
    validXML = function(output) {
        assert.match(output, /^<\?xml version="1.0" encoding="utf-8"\?>/);
        assert.match(output, /<checkstyle>[\s\S]*<\/checkstyle>/);
    },
    aNiceTable = function(output) {
        assert.match(output, /┌[─┬]*┐/);
        assert.match(output, /└[─┴]*┘/);
    },
    empty = function(output) {
        assert.isEmpty(output);
    },
    then = function() {
        var i, context =  {
            topic: function() {
                var filesProcessed = [],
                    jscheckstyle = sandbox.require(
                        '../lib/jscheckstyle',
                        { requires:
                          { 'file': fakeF,
                            'fs': fakeFS(filesProcessed),
                            'util': fakeSys(this.callback),
                            'cli-table': Table
                          },
                          globals: {
                            'process': fakeProcess
                          }
                        }
                    ),
                    cliArgs = this.context.title.substring('with arguments '.length).trim().split(/\s+/);
                jscheckstyle.cli(cliArgs);
            }
        };
        for (i in arguments) {
            arguments[i](context);
        }
        return context;
    };

vows.describe('jscheckstyle command line').addBatch({
    'with arguments dir1':
    then(
        filesProcessedShouldBe(['file7.js','file8.js', 'file9.js']),
        outputShouldBe(aNiceTable)
    ),
    'with arguments file1.js file2.js file3.js':
    then(
        filesProcessedShouldBe(['file1.js','file2.js', 'file3.js']),
        outputShouldBe(aNiceTable)
    ),
    'with arguments --cli file1.js':
    then(
        filesProcessedShouldBe(['file1.js']),
        outputShouldBe(aNiceTable)
    ),
    'with arguments --cli --violations file1.js':
    then(
        outputShouldBe(empty)
    ),
    'with arguments --json file1.js':
    then(
        filesProcessedShouldBe(['file1.js']),
        outputShouldBe(validJSON)
    ),
    'with arguments --html file1.js':
    then(
        filesProcessedShouldBe(['file1.js']),
        outputShouldBe(validHTML)
    ),
    'with arguments --checkstyle file1.js':
    then(
        filesProcessedShouldBe([]),
        outputShouldBe(validXML)
    ),
    'with arguments --violations --checkstyle file1.js':
    then(
        filesProcessedShouldBe([]),
        outputShouldBe(validXML)
    ),
    'process exit': {
        'topic': {
            globals: {
                'String': { 'red': 'dummy' },
                'process': {
                    'stdout': {
                        'flush': function () {
                            return true;
                        }
                    }
                }
            }
        },
        'should return 0 when the results have no violation': function (mocks) {
            var exitCode, jscheckstyle, results;
            mocks.globals.process.exit = function (code) {
                exitCode = code;
            };
            jscheckstyle = sandbox.require(
                '../lib/jscheckstyle',
                mocks
            );
            results = [{
                filename: 'fileX.js',
                results: [
                    { shortName: 'functionY',
                        complexity: 2,
                        lineStart: 10,
                        lines: 20,
                        ins: 2
                    }
                ]
            }];
            jscheckstyle.end(results);
            assert.equal(exitCode, 0);
        },
        'should return 1 when the results have violation': function (mocks) {
            var exitCode, jscheckstyle, results;
            mocks.globals.process.exit = function (code) {
                exitCode = code;
            };
            jscheckstyle = sandbox.require(
                '../lib/jscheckstyle',
                mocks
            );
            results = [{
                filename: 'fileX.js',
                results: [
                    { shortName: 'functionY',
                        complexity: 2,
                        lineStart: 10,
                        lines: 20,
                        ins: 2,
                        violations: [ { message: 'some error', source: 'FunctionLength' } ]
                    }
                ]
            }];
            jscheckstyle.end(results);
            assert.equal(exitCode, 1);
        },
        'should return 0 when an exception is thrown while flushing and the results have no violation': function (mocks) {
            var exitCode, jscheckstyle, results;
            mocks.globals.process.exit = function (code) {
                exitCode = code;
            };
            mocks.globals.process.stdout.flush = function () {
                throw new Exception();
            };
            jscheckstyle = sandbox.require(
                '../lib/jscheckstyle',
                mocks
            );
            results = [{
                filename: 'fileX.js',
                results: [
                    { shortName: 'functionY',
                        complexity: 2,
                        lineStart: 10,
                        lines: 20,
                        ins: 2
                    }
                ]
            }];
            jscheckstyle.end(results);
            assert.equal(exitCode, 0);
        },
        'should return 0 when stdout is not flushed and the results have no violation': function (mocks) {
            var exitCode, jscheckstyle, results;
            mocks.globals.process.exit = function (code) {
                exitCode = code;
            };
            mocks.globals.process.stdout.flush = function () {
                return false;
            };
            mocks.globals.process.stdout.once = function (event, fn) {
                if (event === 'drain') {
                    fn();
                }
            };
            jscheckstyle = sandbox.require(
                '../lib/jscheckstyle',
                mocks
            );
            results = [{
                filename: 'fileX.js',
                results: [
                    { shortName: 'functionY',
                        complexity: 2,
                        lineStart: 10,
                        lines: 20,
                        ins: 2
                    }
                ]
            }];
            jscheckstyle.end(results);
            assert.equal(exitCode, 0);
        }
    }
}).exportTo(module);
