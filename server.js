/**
	server
**/
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var player = new Array();

// wwwディレクトリを静的ファイルディレクトリとして登録
app.use(express.static('www'));

// サーバを開始
server.listen(process.env.PORT||3000);

io.on('connection', function(socket) {

    var userName;

    console.log("新しい接続がありました。" + socket.id);
    
    socket.on('kaigi', function(msg) {
       console.log(msg);
       
       for (var arr in player) {
           if( player[arr]['id'] == socket.id ) {
               userName = player[arr]['name'];
           }
       }
       
       io.emit('kaigi', {msg:msg, userName:userName});

       console.log(player);
    });

    socket.on('userName', function(msg) {
        player.push({ id: socket.id, name: msg, role: "wolf", live: true, death: 0, vote: -1 });
        io.emit('kaigi',{msg:msg+"さんがログインしました。", userName:"GM"});

    });
    
    

	/*
    
     io.emit('chat message', people[socket.id] + ' : ' + msg);
    // show user name
    socket.on('show username', function(username){
        // set username into people
        people[socket.id] = username;
        // add all username in userlist
        var userlist = [];
        for(key in people){
            userlist.push(people[key]);
            console.log(userlist);
        }
        // send username to client
        io.emit('show username', username); // show username in form header
        io.emit('show userlist', userlist); // show userlist in main
    });
    // disconnect socket
    socket.on('disconnect', function(){
        console.log(people[socket.id] + ' has disconnected');
        // remove nickname from people list
        delete people[socket.id];
    });
	
*/
});