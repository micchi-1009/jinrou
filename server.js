/**
	server
**/
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var player = new Array();

var turn = 0;

var role = {
    none: -1,
    vill: 0,
    wolf: 1,
    fort: 2,
    psyc: 3,
    madm: 4,
    hunt: 5,
    shar: 6,
    inum: 7
};

var match = {
    2: [0, 1],
    3: [0, 1, 2],
    4: [0, 0, 1, 2],
    5: [0, 0, 0, 1, 2],

    6: [0, 0, 0, 0, 1, 2],
    7: [0, 0, 0, 0, 0, 1, 2],
    8: [0, 0, 0, 0, 0, 1, 1, 2],
    9: [0, 0, 0, 0, 0, 1, 1, 2, 3],
    10: [0, 0, 0, 0, 0, 1, 1, 2, 3, 4],
    11: [0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 5],
    12: [0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 5],
    13: [0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 6],
    14: [0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 6, 7],
    15: [0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 6, 7],
    16: [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7],
    17: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7],
    18: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7],
    19: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7],
    20: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7],
    21: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7],
    22: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7]
};

function gamestart() {
    var memcount = player.length;

    match[memcount];

    for (var i = 0; i < memcount; i++) {
        player[i]['role'] = match[memcount][i];
    }

    console.log(match[memcount]);
};

// wwwディレクトリを静的ファイルディレクトリとして登録
app.use(express.static('www'));

// サーバを開始
server.listen(process.env.PORT || 3000);

io.on('connection', function (socket) {

    var userName;

    console.log("新しい接続がありました。" + socket.id);
    
    // チャットをmsgに保存
    socket.on('kaigi', function (msg) {
       
        // 開始コマンド
        if (msg == "/start") {

            gamestart();
            console.log("game start!");
        }
       
        // 名前の登録
        for (var arr in player) {
            if (player[arr]['id'] == socket.id) {
                userName = player[arr]['name'];
            }
        }
   
        // チャット送信    
        io.emit('kaigi', { msg: msg, userName: userName });

        // プレイヤー情報を送る
        io.emit('player', player);
    });

    // GMログインメッセージ
    socket.on('userName', function (msg) {
        player.push({ id: socket.id, name: msg, role:role.none , live: true, death: 0, vote: -1 });
        io.emit('kaigi', { msg: msg + "さんがログインしました。", userName: "GM" });

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