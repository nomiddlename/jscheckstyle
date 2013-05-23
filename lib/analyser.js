var burrito = require('burrito');

function isBranch(name) {
    return ["if", "else", "case", "default", "catch", "finally", "?", "||", "&&"].indexOf(name) >= 0;
}

function isExit(name) {
    return ["return", "throw", "exit"].indexOf(name) >= 0;
}

function complexity(node) {
    var edges = 1, nodes = 2, exits = 1;

    function countBranchesAndExits(child) {
        if (isBranch(child.name)) {
            nodes += 1;
            edges += 2;
        } else if (isExit(child.name)) {
            exits += 1;
        }
    }

    function visit(node) {
        node.forEach(function(child) {
            if (child) {
                countBranchesAndExits(child);
                if (Array.isArray(child)) {
                    visit(child);
                }
            }
        });
    }

    visit(node.node);

    return edges - nodes + exits + 1;
}

function workOutAssignedName(assignmentNode) {
    var name = '';

    function visit(child) {
        if (Array.isArray(child)) {
            child.slice(1).forEach(visit);
        } else {
            name += name === '' ? child : '.' + child;
        }
    }

    assignmentNode.value[1].slice(1).forEach(visit);
    return name;
}

function ConfigExtractor(field) {
  this.regexp = new RegExp('\\@jscheckstyle\\.' + field + '=(\\d+)', 'g');

  this.extract = function(comment, config) {
    var match = this.regexp.exec(comment);
    if (match) {
      config[field] = match[1];
    }
  };
}

var configExtractors = [
  new ConfigExtractor('functionLength'),
  new ConfigExtractor('cyclomaticComplexity'),
  new ConfigExtractor('numberOfArguments')
];

function getConfig(node) {
  var config = {};
  if (node.start.comments_before) {
    node.start.comments_before.forEach(function(commentNode) {
      configExtractors.forEach(function(extractor) {
        extractor.extract(commentNode.value, config);
      });
    });
  }
  return config;
}

function analyse(source) {
    var results = [];

    burrito(source, function(node) {
        var fnName = 'anonymous';
        if (node.name === 'defun' || node.name === 'function') {
            if (node.name === 'function' && node.parent().name === 'assign') {
                fnName = workOutAssignedName(node.parent());
            } else if (node.name === 'function' && node.parent().name === 'var') {
                //this looks way too dodgy to work every time.
                fnName = node.state.parents[node.state.parents.length -1].node[0];
            } else if (node.value[0]) {
                fnName = node.value[0];
            }
            results.push({
                shortName: fnName,
                lineStart: node.start.line + 1,
                lines: node.end.line - node.start.line + 1,
                ins: node.value[1].length,
                complexity: complexity(node),
                config: getConfig(node)
            });
        }
    });
    return results;
}

exports.analyse = analyse;
