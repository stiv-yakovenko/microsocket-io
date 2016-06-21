var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
var ms = require('./microsocket-server')(app);


ms.on("test", function (data) {
    console.log("On test");
});

var sockets = [];
ms.on('connection',function(socket){
    sockets.push(socket);
    socket.on("message",function (data) {
        sockets.forEach(function (skt) {
            console.log("emitting " + "message-"+data);
            skt.emit("message","message-"+data);
        });
    });

});

//setInterval(function () {
//    ms.emit("poll", {});
//}, 1000);

module.exports = app;
