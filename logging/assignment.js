// Static class for handling assignment gets and sets.
// TODO: Still stores the assignmentID in window, but should probably own it

var Assignment = {

};

Assignment.initOrRedirect = function() {
    // Get the assignment passed via GET parameter
    window.assignmentID = getSearchParameters()['assignment'];

    var redirectURL = 'logging/assignment.html';

    if (window.requireAssignment && (!window.assignments ||
            !window.assignments[assignmentID])) {
        // redirect if no assignment is listed
        window.location.replace(redirectURL);
    }

    // Also check for a userID
    window.userID = getCookie('snapIDHash');
    if (window.requireLogin && !userID && window.assignmentID !== 'view') {
        if (window.assignmentID) {
            redirectURL += '?assignment=' + window.assignmentID;
        }
        // redirect if the user isn't logged in
        window.location.replace(redirectURL);
    }
};

Assignment.onChangedHandlers = [];

Assignment.get = function() {
    if (!window.assignmentID || !window.assignments) return null;
    return window.assignments[window.assignmentID];
};

Assignment.getID = function() {
    return window.assignmentID;
};

Assignment.setID = function(assignmentID) {
    if (assignmentID === Assignment.getID()) return;
    if (!window.assignments || !window.assignments[assignmentID]) {
        Trace.logErrorMessage('Invalid assignment: ' + assignmentID);
        return;
    }

    // Log the change twice, so it will show up for both assignments
    var formerID = Assignment.getID();
    Trace.log('Assignment.setID', assignmentID);
    window.assignmentID = assignmentID;
    Trace.log('Assignment.setIDFrom', formerID);

    var params = getSearchParameters();
    var path = location.pathname;
    var keys = Object.keys(params);
    var sep = '?';
    keys.forEach(function(key) {
        var val = params[key];
        if (key === 'assignment') val = assignmentID;
        path += sep + encodeURIComponent(key) + '=' +
            encodeURIComponent(val);
        sep = '&';
    });
    window.history.replaceState(assignmentID, assignmentID, path);

    var assignment = Assignment.get();
    Assignment.onChangedHandlers.forEach(function(handler) {
        if (handler) handler(assignment);
    });
};

Assignment.onChanged = function(handler) {
    Assignment.onChangedHandlers.push(handler);
};


extend(IDE_Morph, 'createControlBar', function(baseCreate) {
    baseCreate.call(this);
    var ide = this;
    extendObject(this.controlBar, 'updateLabel', function(base) {
        base.call(this);
        if (ide.isAppMode) return;
        var assignment = Assignment.get();
        if (!assignment) return;
        var text = this.label.text;
        if (Assignment.getID() !== 'none') {
            text += ' - ' + assignment.name;
        }
        var maxLength = 40;
        if (text.length > maxLength) {
            text = text.slice(0, maxLength) + '...';
        }
        this.label.text = text;
        this.label.parent = null;
        this.label.drawNew();
        this.label.parent = this;

        if (!window.allowChangeAssignment) return;

        this.label.mouseEnter = function() {
            document.body.style.cursor = 'pointer';
        };

        this.label.mouseLeave = function() {
            document.body.style.cursor = 'inherit';
        };

        this.label.mouseClickLeft = function() {
            var menu = new MenuMorph(ide);
            var pos = ide.controlBar.label.bottomLeft();
            menu.addItem(
                localize('Change assignment:'), null, null, null, true);
            Object.keys(window.assignments).forEach(function(key) {
                if (key === 'test' || key === 'view') return;
                var assignment = window.assignments[key];
                var name = assignment.name;
                if (assignment.hint) {
                    name += ' (' + assignment.hint + ')';
                }
                menu.addItem(name, function() {
                    Assignment.setID(key);
                    ide.controlBar.updateLabel();
                    ide.controlBar.fixLayout();
                }, null, null, key === Assignment.getID());
            });
            menu.popup(world, pos);
        };
    });
});