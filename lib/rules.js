var rules = module.exports = [];

function Checker(name, rule) {
    this.name = name;
    this.rule = rule;

    this.check = function(results) {
        var violations = [], that = this;
        results.filter(function(result) {
            return result.shortName !== '[[code]]';
        }).forEach(function (result) {
            var violation = that.rule(result);
            if (violation) {
                if (!result.violations) {
                    result.violations = [];
                }
                result.violations.push({
                    message: violation,
                    source: that.name
                });
            }
            violations.push(result);
        });
        return violations;
    };
}
rules.Checker = Checker;

rules.push(
    new Checker("FunctionLength", function(result) {
        var config = result.config || {};
        var functionLength = config.functionLength || 30;

        if (result.shortName !== 'module.exports' && result.lines > functionLength) {
            return result.shortName + " is " + result.lines + " lines long, maximum allowed is " + functionLength;
        }
        return null;
    })
);

rules.push(
    new Checker("CyclomaticComplexity", function(result) {
        var config = result.config || {};
        var cyclomaticComplexity = config.cyclomaticComplexity || 10;
  
        if (result.complexity > cyclomaticComplexity) {
            return result.shortName + " has a cyclomatic complexity of " + result.complexity + ", maximum should be " + cyclomaticComplexity;
        }
        return null;
    })
);

rules.push(
    new Checker("NumberOfArguments", function(result) {
        var config = result.config || {};
        var numberOfArguments = config.numberOfArguments || 5;

        if (result.ins > numberOfArguments) {
            return result.shortName + " has " + result.ins + " arguments, maximum allowed is " + numberOfArguments;
        }
        return null;
    })
);

