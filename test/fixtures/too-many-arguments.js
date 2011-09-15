/**
 * Too many arguments can be a sign that the function is doing too many things
 * or that an opportunity for abstraction has been missed.
 */
function tooManyArguments(one, two, three, four, five, six, seven, eight) {
    //it's not as if I'm going to do anything with them.
    return one + two + three + four + five + six + seven + eight;
}
