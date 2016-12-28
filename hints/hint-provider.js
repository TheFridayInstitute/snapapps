require('hint-display');

function HintProvider(url, displays, reloadCode) {
    this.init(url, displays, reloadCode);
}

HintProvider.prototype.init = function(url, displays, reloadCode) {
    this.url = url;
    this.lastHints = [];
    this.requestNumber = 0;
    this.reloadCode = reloadCode;

    if (!displays) displays = [];
    if (!displays.length) displays = [displays];
    this.displays = displays;

    var myself = this;

    if (reloadCode) {
        window.onunload = function() {
            myself.saveCode();
        };

        myself.loadCode();
    }

    if (displays.length == 0 || !window.assignments) return;
    var assignment = window.assignments[window.assignmentID];
    if (!assignment) return;

    // First check the parameters for a hints parameter
    var params = getSearchParameters();
    if ('hints' in params) {
        // If it's present, use that value
        if (params['hints'] !== 'true') return;
    } else {
        // If not, check the config
        if (!assignment.hints) return;
    }

    displays.forEach(function(display) {
        display.enabled = true;
    });

    Trace.onCodeChanged = function(code) {
        myself.clearDisplays();
        myself.code = code;
        myself.getHintsFromServer(code);
    };

    window.onWorldLoaded = function() {
        myself.displays.forEach(function(display) {
            if (display.initDisplay) display.initDisplay();
        });
    };
};

HintProvider.prototype.clearDisplays = function() {
    this.displays.forEach(function(display) {
        display.clear();
    });
};

HintProvider.prototype.getHintsFromServer = function() {
    if (!this.code) return;

    if (!this.displays.some(function(display) {
        return display.enabled;
    })) return;

    var myself = this;

    if (this.lastXHR) {
        // cancel the last hit request's callbacks
        this.lastXHR.onload = null;
        this.lastXHR.onerror = null;
    }

    this.clearDisplays();

    var xhr = createCORSRequest('POST',
        this.url + '?assignmentID=' + window.assignmentID);
    if (!xhr) {
        myself.showError('CORS not supported on this browser.');
        return;
    }
    this.lastXHR = xhr;

    // Response handlers.
    var requestNumber = ++this.requestNumber;
    xhr.onload = function() {
        myself.processHints(xhr.responseText, requestNumber);
    };

    xhr.onerror = function(e) {
        myself.showError('Error contacting hint server!');
    };

    xhr.send(this.code);
};

HintProvider.prototype.showError = function(error) {
    Trace.logErrorMessage(error);
    this.displays.forEach(function(display) {
        if (display.enabled) {
            display.showError(error);
        }
    });
};

HintProvider.prototype.processHints = function(json, requestNumber) {
    try {
        var hints = JSON.parse(json);
        Trace.log('HintProvider.processHints', hints);
        // If a more recent request has been fired, wait on that one
        // This is below the log statement because if we have pending code
        // changes to log, they'll flush and call a new request, and this one
        // should then be ignored.
        if (this.requestNumber != requestNumber) return;
        for (var i = 0; i < hints.length; i++) {
            var hint = hints[i];
            this.displays.forEach(function(display) {
                if (display.enabled) {
                    try {
                        display.showHint(hint);
                    } catch (e2) {
                        Trace.logError(e2);
                    }
                }
            });
        }
        this.displays.forEach(function(display) {
            if (display.enabled) {
                try {
                    display.finishedHints();
                } catch (e2) {
                    Trace.logError(e2);
                }
            }
        });
        this.lastHints = hints;
    } catch (e) {
        Trace.logError(e);
    }
};

HintProvider.prototype.saveCode = function() {
    if (typeof(Storage) !== 'undefined' && localStorage && this.code) {
        localStorage.setItem('lastCode-' + window.assignmentID, this.code);
    }
};

HintProvider.prototype.loadCode = function() {
    if (typeof(Storage) !== 'undefined' && localStorage) {
        var code = localStorage.getItem('lastCode-' + window.assignmentID);
        if (code) {
            if (window.ide) {
                window.ide.droppedText(code);
            } else {
                var myself = this;
                setTimeout(function() {
                    myself.loadCode();
                }, 100);
            }
        }
    }
};

HintProvider.prototype.setDisplayEnabled = function(displayType, enabled) {
    this.displays.forEach(function(display) {
        if (display instanceof displayType) {
            display.enabled = enabled;
            if (!enabled) {
                display.clear();
            }
        }
    });
    if (enabled) this.getHintsFromServer();
};

HintProvider.prototype.showLoggedHint = function(data) {
    this.displays.forEach(function(display) {
        display.showLoggedHint(data);
    });
};