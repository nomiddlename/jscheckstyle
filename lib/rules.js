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
        if (result.shortName !== 'module.exports' && result.lines > 30) {
            return result.shortName + " is " + result.lines + " lines long, maximum allowed is 30";
        }
        return null;
    })
);

rules.push(
    new Checker("CyclomaticComplexity", function(result) {
        if (result.complexity > 10) {
            return result.shortName + " has a cyclomatic complexity of " + result.complexity + ", maximum should be 10";
        }
        return null;
    })
);

rules.push(
    new Checker("NumberOfArguments", function(result) {
        if (result.ins > 5) {
            return result.shortName + " has " + result.ins + " arguments, maximum allowed is 5";
        }
        return null;
    })
);

