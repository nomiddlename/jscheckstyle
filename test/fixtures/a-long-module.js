module.exports = function() {

    function someInternalFunction() {
        /**
         * it does something
         */
        return true;
    }

    function anotherFunction() {
        /**
         * with
         * a
         * giant
         * comment
         * to
         * bulk
         * up
         * the
         * number
         * of
         * lines
         * so
         * that
         * we
         * would
         * trigger
         * the
         * function
         * length
         * rule
         */
        return false;
    }
};