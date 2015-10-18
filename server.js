/*
 * server.js
 * Copyright (C) 2015 ******* <****@********>
 */
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var players = new Array();

// 参加者コンストラクタ
var entrant = function (id, name) {

    this.socketId = id;  // socket.ioのID
    this.userName = name;// ユーザ名
    this.role = null;    // 役割
    this.vote = null;    // 投票
    this.lifeAndDeath = true;

};

players.push(new entrant(0,0));





var player = new Array();

var turn = 0;


// 連想配列のキーに変数を使えないので実数を入力した
var actions = {
    1: -1,
    2: -1,
    5: -1
};


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


function shuffle(array) {
    var n = array.length, t, i;

    while (n) {
        i = Math.floor(Math.random() * n--);
        t = array[n];
        array[n] = array[i];
        array[i] = t;
    }

    return array;
}

function gamestart() {
    var memcount = player.length;

    var change = match[memcount];

    shuffle(change);

    for (var i = 0; i < memcount; i++) {
        player[i]['role'] = change[i];
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
    
    // プレイヤー情報を送る
    io.emit('player', player);
    
    // チャットをmsgに保存
    socket.on('kaigi', function (msg) {

        var sendflag = true;
        console.log(socket.id + ': ' + msg);
       
        // なんちゃってGMコマンド
        switch (msg) {

            case "/start":
                gamestart();
                console.log("game start!");
                sendflag = false;
                // プレイヤー情報を送る
                io.emit('player', player);
                break;

            case "/stop":
                turn = 0;
                for (var arr in player) {
                    player[arr]['role'] = role.none;
                    player[arr]['live'] = true;
                    player[arr]['death'] = 0;
                    player[arr]['vote'] = -1;
                }
                sendflag = false;
                // プレイヤー情報を送る 
                io.emit('player', player);
                break;

            case "/debug":
                console.log(actions);
                sendflag = false;
                // プレイヤー情報を送る
                io.emit('player', player);
                break;
        }
        var result;
        
        // voteコマンド
        result = msg.match(/\/vote (\d+) (\d+)/);
        if (result) {
            player[result[1]]['vote'] = result[2];

            sendflag = false;
        }
        
        // kickコマンド
        result = msg.match(/\/kick (\d+)/);
        if (result) {
            io.emit('kaigi', { msg: player[result[1]]['name'] + "さんがkickされました。", userName: "GM" });

            player.splice(result[1], 1);

            sendflag = false;
            // プレイヤー情報を送る
            io.emit('player', player);
        }
        
        // actionコマンド
        result = msg.match(/\/action (\w+) (\d+)/);
        if (result) {
            switch (result[1]) {

                case "wolf":
                    actions[role.wolf] = result[2];
                    break;

                case "fort":
                    actions[role.fort] = result[2];
                    break;

                case "hunt":
                    actions[role.hunt] = result[2];
                    break;
            }

            sendflag = false;
        }
       
        // 名前の登録
        for (var arr in player) {
            if (player[arr]['id'] == socket.id) {
                userName = player[arr]['name'];
            }
        }
        
        // チャット送信
        if (sendflag) {
            io.emit('kaigi', { msg: msg, userName: userName });
        }
    });

    // GMログインメッセージ
    socket.on('userName', function (msg) {
        player.push({ id: socket.id, name: msg, role: role.none, live: true, death: 0, vote: -1 });
        io.emit('kaigi', { msg: msg + "さんがログインしました。", userName: "GM" });

        // プレイヤー情報を送る
        io.emit('player', player);
    });

});