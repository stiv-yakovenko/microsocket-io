//

var MicroSocket = function (options) {
    var sid = null;
    options = options || {};
    options.url = options.url || '/socket';
    options.auth = options.auth || {};
    options.reconnectTimeout = options.reconnectTimeout || 3000;
    var doReconnect = function () {
        $.ajax({
            url: url, type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(options.auth)
        }).done(function (resp) {
            sid = resp;
            onReady([]);
        }).fail(function (e) {
            setTimeout(function () {
                if (!sid) doReconnect();
            }, options.reconnectTimeout);
        });
    };
    var doPost = function (url, obj, ok) {
        $.ajax({
            url: url + '?sid=' + sid, type: "POST",
            contentType: 'application/json',
            data: JSON.stringify(obj)
        }).done(function (e) {
            var respObj = [];
            if (e.length != 0) {
                try {
                    var respObj = JSON.parse(e);
                } catch (e) {
                    console.error("Garbage from server.");
                }
            }
            ok(respObj);
        }).fail(function (e) {
            console.log("disconnected");
            sid = null;
            doReconnect();
        });
    };
    var stack = [];
    var handlers = [];
    var onReady = function (data, noCallBack) {
        for (var k in data) {
            var obj = data[k];
            if (obj.name && handlers[obj.name]) {
                try {
                    handlers[obj.name](obj.obj);
                } catch (e) {
                    console.error(e);
                }
            }
        }
        if (!noCallBack) {
            var elems = stack;
            stack = [];
            doPost(options.url, elems, function (data) {
                onReady(data);
            });
        }
    };
    this.emit = function (msg, obj) {
        stack.push({name: msg, obj: obj});
        var elems = stack;
        stack = [];
        doPost(options.url, elems, function (data) {
            onReady(data, true);
        });
    };
    this.on = function (msg, cb) {
        handlers[msg] = cb;
    };
    doReconnect();
};