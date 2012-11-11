var analyser = require('./analyser'),
    Table = (String.red) ? '' : require('cli-table'),
    f = require('file'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    renderers = {},
    checkstyleRules = require("./rules");

function analyse(label, source) {
    return {
        filename: label,
        results: analyser.analyse(source)
    };
}

function run(filename) {
    return analyse(filename, fs.readFileSync(filename, "utf8"));
}

function jsonRenderer(results) {
    return JSON.stringify(results);
}

function applyRules(results) {
    var annotatedResults = results.map(function(file) {
        var checkedResults = file.results;
        checkstyleRules.forEach(function(rule) {
            checkedResults = rule.check(checkedResults);
        });
        return { filename: file.filename, results: checkedResults };
    });
    return annotatedResults;
}

function hasViolations(result) {
    return result.violations && result.violations.length > 0;
}

function violationsOnly(results) {
    var filtered = [],
        allResults = applyRules(results);
    //first strip out any non-violating results
    allResults.forEach(function (file) {
        file.results = file.results.filter(hasViolations);
    });
    //then strip out any files without results (no violations at all)
    return allResults.filter(function (file) { return file.results.length > 0; });
}

function cliTableRenderer(results) {
    var output = [];
    results.forEach(function(file) {
        output.push("jscheckstyle results - ".green + file.filename);
        var table = new Table({
            head: ["Line", "Function", "Length", "Args", "Complexity"],
            colWidths: [ 8, 40, 8, 6, 10 ]
        });
        file.results.forEach(function(fn) {
            table.push([fn.lineStart, fn.shortName, fn.lines, fn.ins, fn.complexity]);
        });
        output.push(table.toString());
    });
    return output.join("\n");
}

function htmlRenderer(results) {
    var i, comp, mi, pl;

    var d = {
        buffer: ["<!doctype html><html><head><title>jscheckstyle results</title></head><body>"],
        write : function(t) {
            if (t===0) {
                t = "0";
            }
            t = t || "";
            if (typeof t !== "string") {
                t = t.toString();
            }
            this.buffer.push(t);
        },
        toString: function() {
            return this.buffer.join('');
        }
    };

    function title(value) {
        d.write("<h1>");
        d.write(value);
        d.write("</h1>");
    }

    function table(header, rows) {
        d.write("<table><thead>");
        d.write(header);
        d.write("</thead><tbody>");
        d.write(rows);
        d.write("</tbody></table>");
    }

    function header() {
        return ["<tr>"].concat(
            [
                "Line",
                "Function",
                "Lines",
                "Arguments",
                "Cyclomatic Complexity"
            ].map(
                function(column) { return "<th>" + column + "</th>"; }
            )).concat(["</tr>"]).join("");
    }

    function rows(results) {
        function redIf(test, value) {
            return test ? '<span style="color:red">' + value + '</span>' : value;
        }

        return results.map(function(item) {
            return [ "<tr>" ].concat(
                [ item.lineStart,
                  item.shortName,
                  redIf(item.lines > 30, item.lines),
                  redIf(item.ins > 5, item.ins),
                  redIf(item.complexity > 10, item.complexity)
                ].map(
                    function(column) { return "<td>" + column + "</td>" ; }
                )).concat(["</tr>"]).join("");
        }).join("\n");
    }

    results.forEach(function(item) {
        title(item.filename);
        table(
            header(),
            rows(item.results)
        );
    });
    d.write("</body></html>");
    return d.toString();

}

function checkstyleRenderer(data) {
    var output = [ '<?xml version="1.0" encoding="utf-8"?>\n<checkstyle>' ],
        results = violationsOnly( Array.isArray(data) ? data : [ data ] );

    results.forEach(function(file) {
        output.push('<file name="' + file.filename + '">');
        file.results.forEach(function(result) {
            result.violations.forEach(function(violation) {
                output.push('<error line="' + result.lineStart + '" column="1" severity="error" message="' + violation.message + '" source="' + violation.source + '"/>');
            });
        });
        output.push('</file>');
    });

    output.push('</checkstyle>');
    return output.join('\n');

}

function emacsRenderer(data) {
    var output = [],
    results = violationsOnly(Array.isArray(data) ? data : [ data ]);
    
    results.forEach(function(file) {
        file.results.forEach(function(result) {
            result.violations.forEach(function(violation) {
                output.push(file.filename + ', line=' + result.lineStart + ', column=1, message="' + violation.message + '" source="' + violation.source + '"');
            });
        });
    });
       
    return output.join('\n');
}


function register(renderer, values) {
    values.forEach(function(item) {
        renderers[item] = renderer;
    });
}

function addFile(file, files, ignores) {
    var isIgnored = false,
        i, ln;
    for (i = 0, ln = ignores.length; i < ln; i += 1) {
        if (file.match(new RegExp('^' + ignores[i]))) {
            isIgnored = true;
            break;
        }
    }
    if (!isIgnored) {
        files.push(file);
    }
}

function files(arg) {
    var stat = fs.statSync(arg),
        files = [],
        ignoreFile = path.join(process.cwd(), '.jscheckstyleignore'),
        ignores = [];

    if ((fs.existsSync) ? fs.existsSync(ignoreFile) : path.existsSync(ignoreFile)) {
        ignores = fs.readFileSync(ignoreFile, 'utf-8').split('\n').filter(function (line) {
            return !!line;
        });
    }

    if (stat.isDirectory()) {
        f.walkSync(arg, function (base, dirs, names) {
            names.forEach(function (name) {
                if (name.match(/.js$/)) {
                    addFile(path.join(base, name), files, ignores);
                }
            });
        });
    } else {
        addFile(arg, files, ignores);
    }
    return files;
}

function end(results) {
    var errCount = 0;
    results = violationsOnly(results);
    results.forEach(function (result) {
        errCount += result.results.length;
    });

    function exit() {
        process.exit(errCount  > 0 ? 1: 0);
    }
    try {
        if (!process.stdout.flush()) {
            process.stdout.once('drain', exit);
        } else {
            exit();
        }
    } catch (e) {
        exit();
    }
}

register(checkstyleRenderer, ['--checkstyle','checkstyle']);
register(jsonRenderer, ['--json','json']);
register(htmlRenderer, ['--html','html']);
register(cliTableRenderer, ['--cli', 'table']);
register(emacsRenderer, ['--emacs', 'emacs']);

exports.renderers = renderers;
exports.analyse = analyse;
exports.violationsOnly = violationsOnly;
exports.run = run;
exports.end = end;
exports.cli = function(arguments) {
    var renderer = '--cli',
        onlyViolations = false,
        results = [];

    arguments.forEach(function (arg) {
        if (renderers[arg]) {
            renderer = arg;
        } else if (arg === '--violations') {
            onlyViolations = true;
        } else {
            files(arg).forEach(function (file) {
                results.push(
                    run(file)
                );
            });
        }
    });

    if (onlyViolations && renderer !== '--checkstyle') {
        results = violationsOnly(results);
    }
    util.puts(renderers[renderer](results));
    end(results);
};
