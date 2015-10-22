/**
	server
**/
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// wwwディレクトリを静的ファイルディレクトリとして登録
app.use(express.static('www'));

// サーバを開始
server.listen(process.env.PORT || 3000);


var player = new Array();

var turn = 0;


// 連想配列のキーに変数を使えないので実数を入力した
var actions = { 
  1 : -1,  
  2 : -1,
  5 : -1  
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

// シャッフル
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

//　ゲームをスタートする
function gamestart(shonichi) {
    turn = 1;
    
    io.emit('turn', turn);
    
    io.emit('kaigi', { msg: timing(), userName: "GM" });
    
    var memcount = player.length;

    do{
        var change = match[memcount];
        
        shuffle(change);
    
        for (var i = 0; i < memcount; i++) {
            player[i]['role'] = change[i];
        }
    } while(player[shonichi]['role'] == role.wolf)

    console.log(match[memcount]);
};

function timing() {
    var day = Math.ceil(turn / 2);
    var time;

    if (turn % 2 == 0) {
        time = "昼";
    } else {
        time = "夜";
    }

    return day + "日目 " + time;
}

function next() {

    if (turn % 2 == 1) {
        // 夜→昼
        turn++;
        io.emit('kaigi', { msg: timing(), userName: "GM" });

        if (actions[role.wolf] != actions[role.hunt]) {
            player[actions[role.wolf]]['live'] = false;
            player[actions[role.wolf]]['death'] = turn;


            io.emit('kaigi', { msg: player[actions[role.wolf]]['name'] + "さんが無残な死体で発見されました。", userName: "GM" });
        }

    } else {
        // 昼→夜
        // TODO: 投票処理
        turn++;
        io.emit('kaigi', { msg: timing(), userName: "GM" });
    }
    // ターン情報を送る
    io.emit('turn', turn);
    
    // プレイヤー情報を送る
    io.emit('player', player);
};

io.on('connection', function (socket) {

    var userName;

    console.log("新しい接続がありました。" + socket.id);
    
    // プレイヤー情報を送る
    io.emit('player', player);
    
    // チャットをmsgに保存
    socket.on('kaigi', function (msg) {
       
       var sendflag = true;
       console.log(socket.id+': '+msg);
       
        // なんちゃってGMコマンド
        switch (msg) {

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
                player[2]['live']=false;
                sendflag = false;
                // プレイヤー情報を送る
                io.emit('player', player);   
                break; 
                
            case "/nextturn":
                next();
                sendflag = false;
        }
        var result;
        
        //startコマンド
        result = msg.match(/\/start (\d+)/);
        if (result) {

            actions[role.wolf] = result[1];

            if (turn == 0) {
                gamestart(result[1]);
                console.log("game start!");
            }
            sendflag = false;
            // プレイヤー情報を送る
            io.emit('player', player);
        }
    
        // voteコマンド
        result = msg.match(/\/vote (\d+) (\d+)/);
        if(result){
            player[result[1]]['vote'] = result[2];
            
            sendflag = false;
        }
        
        // kickコマンド
        result = msg.match(/\/kick (\d+)/);
        if (result){
            io.emit('kaigi', { msg: player[result[1]]['name'] + "さんがkickされました。", userName: "GM" });
            
            player.splice( result[1] , 1 ) ;
            
            sendflag = false;
            // プレイヤー情報を送る
            io.emit('player', player);
        }
        
        // killコマンド
        result = msg.match(/\/kill (\d+)/);
        if(result){
            player[result[1]]['live'] = false;
            
            sendflag = false;
            // プレイヤー情報を送る
            io.emit('player', player);
        }
            
         // rebornコマンド
         result = msg.match(/\/reborn (\d+)/);
         if(result){
            player[result[1]]['live'] = true;
                
            sendflag = false;
            // プレイヤー情報を送る
            io.emit('player', player)
         }
        
        // turnコマンド
        result = msg.match(/\/turn (\d+)/);
        if (result) {
            turn = result[1];

            io.emit('kaigi', { msg: timing(), userName: "GM" });

            sendflag = false;
            
            // ターン情報を送る
            io.emit('turn', turn);
        }
        
        // actionコマンド
        result = msg.match(/\/action (\w+) (\d+)/);
        if(result){
            switch(result[1]){
            
                case "wolf":
                    actions[role.wolf]=result[2];
                    break;
                    
                case "fort":
                    actions[role.fort]=result[2];
                    break;
                    
                case "hunt":
                    actions[role.hunt]=result[2];
                    break;
            }
            
            sendflag = false;
        }
        
        socket.on('judge',function(target){
            console.log(target);
        });
       
        // 名前の登録
        for (var arr in player) {
            if (player[arr]['id'] == socket.id) {
                userName = player[arr]['name'];
            }
        }
        
        // チャット送信
        if ( sendflag ) { 
            
            
            io.emit('kaigi', { msg: msg, userName: userName, turn: turn });
        }
    });

    // GMログインメッセージ
    socket.on('userName', function (msg) {
        player.push({ id: socket.id, name: msg, role: role.none, live: true, death: 0, vote: -1 });
        io.emit('kaigi', { msg: msg + "さんがログインしました。", userName: "GM" });

        // プレイヤー情報を送る
        io.emit('player', player);
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