/*
 * server.js
 * Copyright (C) 2015 ******* <****@********>
 */
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// 配役を示す連想配列
var castList = {
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

// 参加者情報コンストラクタ
var entrant = function (id, name) {
    this.socketId = id;  // socket.ioのID
    this.userName = name;// ユーザ名
    this.role = null;    // 役割
    this.vote = null;    // 投票
    this.lifeAndDeath = true;
};

var game = function() {
    this.member = new Array();  // メンバーのオブジェクト
    this.numOfProgression = 0;  // ゲームの進行カウント

    this.setMember = function(entrant) {
        this.member.push(entrant);
    };
    this.getMember = function() {
        return this.member;
    };
    this.shuffle = function (array) {
        var n = array.length, t, i;

        while (n) {
            i = Math.floor(Math.random() * n--);
            t = array[n];
            array[n] = array[i];
            array[i] = t;
        }
    };
    this.setCast = function() {
        var numOfMember = this.member.length;
        if ( numOfMember < 2 || this.numOfProgression!=0 ) return false;
        this.castTable = new Array();
        this.castTable = castList[numOfMember];
        this.shuffle(this.castTable);

        for (var i in this.member) {
            this.member[i].role = this.castTable[i];
        };
        return true;
    };
    this.getUserName = function(id) {
        for (var i in this.member) {
            if (this.member[i].socketId == id) {
                return this.member[i].userName;
            }
        }
    };
    this.gameStart = function() {
        if (this.setCast()) {
            // ゲーム開始後の処理
            this.numOfProgression = 1;
        } else {
            //ゲームが開始出来ない場合の特別な処理
        }
    };
    this.gameInit = function() {
        this.member = new Array();
        this.numOfProgression = 0;
    };
    this.gameStop = function() {
        // gameStopの存在意義が分からないので実装保留
        this.gameInit();
        /*
        this.numOfProgression = 1;
        for ( var i in this.member) {
            this.member[i].role = null;    // 役割
            this.member[i].vote = null;    // 投票
            this.member[i].lifeAndDeath = true;
        }
        */
    };
};


/* -- -- */
var g = new game();

/*
player.getMember();
*/


// wwwディレクトリを静的ファイルディレクトリとして登録
app.use(express.static('www'));

// サーバを待ち受け
server.listen(process.env.PORT || 3000);

io.on('connection', function (socket) {

    console.log("新しい接続がありました。" + socket.id);

    // ユーザの参加処理
    socket.on('userJoin', function (name) {
        g.setMember(new entrant(socket.id, name));
        // ToDo: kaigiを修正
        io.emit('kaigi', { userName: "GM", msg: name + "さんがログインしました。"});
    });

    // 会議チャットを受信
    socket.on('kaigi', function (text) {
        
        // 受信したメッセージをコンソールログに出力
        console.log(socket.id + ': ' + text);

        // ゲーム開始のパラメータを受信した場合
        switch (text) {
            // 以下GMコマンドとして動作
            case "/start":
                g.gameStart();
                break;
            case "/stop":
                g.gameStop();
                break;
            case "/debug":
                // 用途に合わせて追加する
                break;
            // 会議チャット用
            default:
                io.emit('kaigi', { userName: g.getUserName(socket.id), msg: text });
                break;
        }

        // プレイヤー情報を送る
        //io.emit('player', player);タイミング整理

    });

});


/* -------------Not refactoring--------------- */
/*
// 連想配列のキーに変数を使えないので実数を入力した
var actions = {
    1: -1,
    2: -1,
    5: -1
};

var role = {
    none: -1,   // 無し
    vill: 0,    // 村人
    wolf: 1,    // 人狼
    fort: 2,    // 占い師
    psyc: 3,    // 霊能者
    madm: 4,    // 狂人
    hunt: 5,    // 狩人
    shar: 6,    // 共有者
    inum: 7     // 妖狐
};

        // なんちゃってGMコマンド
        switch (msg) {
            default:
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
*/