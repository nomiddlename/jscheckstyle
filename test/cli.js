var vows = require('vows'),
    assert = require('assert'),
    sandbox = require('sandboxed-module'),
    Table = require('cli-table'),
    fakeFS = function (filesProcessed) {
        return {
            readFileSync: function(file) {
                filesProcessed.push(file);
                return "var a=1";
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
        assert.match(output, /┏[━┳]*┓/);
        assert.match(output, /┗[━┻]*┛/);
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
                          { 'fs': fakeFS(filesProcessed),
                            'sys': fakeSys(this.callback),
                            'cli-table': Table
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
    )
}).exportTo(module);
