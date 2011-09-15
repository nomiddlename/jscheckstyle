# Purpose
A command-line tool for analysing javascript source, providing measurements of function length, number of arguments, and cyclomatic complexity.

## Installation
    npm install jscheckstyle

## Usage
    jscheckstyle some-javascript.js some-other-javascript.js (default output as nice table on command line)
    jscheckstyle --violations some-javascript.js (will output rule-violating functions only)
    jscheckstyle --html some-javascript.js > output.html
    jscheckstyle --json some-javascript.js > output.json
    jscheckstyle --checkstyle some-javascript.js > output.xml (will output Java checkstyle-compatible output, useful for Jenkins)

## Rules
There are three rules at the moment which will be violated if:

* function length is greater than 30 lines
* number of arguments to a function is greater than 5
* cyclomatic complexity for a function is greater than 10

## TODO
* Configurable rules (maybe you like functions that are longer or shorter)

## History
Originally I started out modifying [jsmeter](http://jsmeter.info) to run as a command-line tool. Then I started hacking away, added some tests, the command-line interface, added the rules checking and the extra output types, replaced the parser with [node-burrito](https://github.com/substack/node-burrito) and then realised there wasn't much of jsmeter left. So this tool is inspired by, and owes a huge debt to, jsmeter - but there's very little of the original code to be found (possibly only the HTML output renderer).
