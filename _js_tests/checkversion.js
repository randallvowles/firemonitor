    function checkVersion(_) {

        if (typeof _ === "undefined") {
            return false;
        }
        else if (typeof _ === "string") {
            // Determine if we have an operator
            var op = _.charAt(0);
            if (op === ">" || op === "<") {
                
            }
            cout("have string");
        }
        else if (typeof _ === "object" && typeof _.major !== "undefined") {
            cout("have object");
        }
        else {
            return false;
        }
    }