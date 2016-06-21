var uid = function () {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
};

module.exports = function (app, options) {
    options = options || {};
    options.url = options.url || '/socket';
    var handlers = {};
    var onAuth = null;
    var sockets = {};
    this.on = function (msg, cb) {
        handlers[msg] = cb;
    };
    this.auth = function (cb) {
        onAuth = cb;
    };
    var doAuth = function (req, resp) {
        var authObj = req.query.body;
        var authCB = onAuth || function (obj, cb) {
                cb(true);
            };
        authCB(authObj, function (res) {
            if (!res) {
                resp.status(400);
                resp.end();
                return;
            }
            var sid = uid();
            resp.send(sid);
            var stack = [];
            sockets[sid] = {stack: stack, opened: null, handlers: {}};
            resp.end();
            var onConnected = handlers['connection'];
            if (onConnected) {
                onConnected({
                    emit: function (msg, data) {
                        sockets[sid].stack.push({name: msg, obj: data});
                        if (sockets[sid].opened) {
                            sockets[sid].opened.end();
                            sockets[sid].opened = null;
                        }
                    },
                    on: function (msg, cb) {
                        sockets[sid].handlers[msg] = cb;
                    }
                });
            }
        });
    };
    app.post(options.url, function (req, resp) {
        var sid = req.query.sid;
        if (!sid) {
            doAuth(req, resp);
            return;
        }
        var sidEntry = sockets[sid];
        if (!sidEntry) {
            resp.status(401);
            resp.end();
            return;
        }
        if (sidEntry.opened) {
            sidEntry.opened.end();
            sidEntry.opened = null;
        }
        for (var k in req.body) {
            var obj = req.body[k];
            if (obj.name && sidEntry.handlers[obj.name]) {
                sidEntry.handlers[obj.name](obj.obj);
            }
        }
        if (sidEntry.stack.length) {
            console.log("sending " + JSON.stringify(sidEntry.stack));
            resp.send(JSON.stringify(sidEntry.stack));
            resp.end();
            sidEntry.stack = [];
        } else {
            sidEntry.opened = resp;
        }
    });
    return this;
};