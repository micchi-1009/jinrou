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


// 役職達の指定先の初期化
function actionInit() {
    return {
        1: -1,
        2: -1,
        5: -1
    };
}

var player = new Array();
var turn = 0;

var timer;
var myTime;
var phase=0; // 0:昼 1:投票 2:夜

// 連想配列のキーに変数を使えないので実数を入力した
var actions = actionInit();

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

// roleの変換
var exchange = {
	'-1': '無し',
	'0': '村人',
	'1': '人狼',
	'2': '占い師',
	'3': '霊能者',
	'4': '狂人',
	'5': '狩人',
	'6': '共有者',
	'7': '妖狐',	
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

// インターバル変数
var timeInterval;

// 時間カウント用
var countTime = 0;

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
    phase = 2;
    
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

    // タイマー駆動型のイベントを定義
    timeInterval = setInterval(function () {
        countTime++;
        roopPhase();
        console.log(countTime + "秒");
        console.log(phase + "フェイズ");
    }, 1000);

};

function roopPhase() {
    switch (phase) {
        case 0: // 昼ターン中
            // デバッグ中＠4分（60*4）
            if (countTime > 30) {
                // 昼ターンの終了処理
                voteStart();

                countTime = 0;
                phase++;
            }
            break;

        case 1: // 投票
            // デバッグ中＠2分（60*2）
            if (countTime > 30) {
                // 足りない（投票してない）ユーザを殺す処理
                
                for (var arr in player) {
                    if (player[arr]['vote'] == -1 && player[arr]['live'] == true) {
                        player[arr]['live'] = false;
                        player[arr]['death'] = turn;
                        io.emit('kaigi', { msg: player[arr]['name'] + "さんは不思議な力により死亡しました。", userName: "GM" });
                    }
                }
                
                // 投票の完了処理
                voteEnd();

                countTime = 0;
            }
            break;

        case 2: // 夜
            // デバッグ中＠2分（60*2）
            if (countTime > 30) {
                // 人狼が噛んでない場合。人狼を消し去る処理
                for (var arr in player) {
                    if (actions[role.wolf] == -1 && player[arr]['role'] == role.wolf && player[arr]['live'] == true) {
                        player[arr]['live'] = false;
                        player[arr]['death'] = turn;
                        io.emit('kaigi', { msg: player[arr]['name'] + "さんは不思議な力により死亡しました。", userName: "GM" });
                    }
                }

                nightEnd();
                phase = 0;
                countTime = 0;
            }
            break;

    }        
}

// 時間の計算
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

// 投票で選ばれた人の番号を求める
// 成功したとき：0以上の値
// 失敗したとき：-1
function hitVote() {
    var seikou;
    var max=0;
    var hit;
    
    // 被投票数を調べる為の変数を初期化
    for(var arr in player){
        player[arr]['voted']=0;
    }

    // 被投票数を調べる処理
    for(var arr in player){
        if(player[arr]['vote']!=-1){
            player[player[arr]['vote']]['voted']++;
        }
    }
    
    // 最大投票の調査と重複の確認
    for(var arr in player){
        if(player[arr]['voted']>max){
            max=player[arr]['voted'];
            hit=arr;
            seikou = true;
        }else if(player[arr]['voted']==max){
            seikou = false;
        }
    }
    
    if (seikou) {
        return hit;
    } else {
        return -1;
    }

}

// 投票の開始処理
function voteStart() {

    // 投票の為に初期化処理
    for (var arr in player) {
        player[arr]['vote'] = -1;
        player[arr]['voted'] = 0;
    }
    
    // 昼会議終了の告知
    io.emit('kaigi', { msg: "昼時間が終了しました。投票を開始してください。", userName: "GM" });
    
    // ToDo: 会議を禁止する処理

}

// 投票の完了処理
function voteEnd() {
    
    // 時間を初期化する
    countTime = 0;
    
    // 投票で選ばれた人を探す
    var hit = hitVote();
    
    // 投票者の通知
    for (var arr in player) {
        if (player[arr]['live'] == true) {
            io.emit('kaigi', { msg: player[arr]['name'] + "→" + player[player[arr]['vote']]["name"], userName: "GM" });
        }
    }
    
    if (hit == -1) {
        
        // 再投票メッセージの送信
        io.emit('kaigi', { msg: "再投票になりました。もう一度投票してください。", userName: "GM" });
        io.emit('player', { player: player, turn: turn });

        // 投票の開始処理      
        voteStart();

    } else {
        // 昼→夜

        // 吊られた人の通知
        io.emit('kaigi', { msg: "投票の結果" + player[hit]['name'] + "さんが吊られました。", userName: "GM" });

        // 吊られた人のステイタスを変更
        player[hit]['live'] = false;
        player[hit]['death'] = turn;

        turn++;
        io.emit('kaigi', { msg: timing(), userName: "GM" });

        // プレイヤー情報を送る
        io.emit('player', { player: player, turn: turn });
            
        if (winer() == true) {
            // End
        } else {
            // continue
        }
        
        phase++;
    }

}

// 夜ターン終了後の判定
function nightEnd() {

    // 夜→昼
    turn++;
    
    // 日時変更を通知する
    io.emit('kaigi', { msg: timing(), userName: "GM" });
        
    // 人狼の噛み判定
    if (actions[role.wolf] != actions[role.hunt]) {
        player[actions[role.wolf]]['live'] = false;
        player[actions[role.wolf]]['death'] = turn;

        io.emit('kaigi', { msg: player[actions[role.wolf]]['name'] + "さんが無残な死体で発見されました。", userName: "GM" });
    }

    // 占い師の妖狐呪殺
    if (actions[role.fort] != -1 && (player[actions[role.fort]]['role'] == role.inum)) {
        player[actions[role.fort]]['live'] = false;
        player[actions[role.fort]]['death'] = turn;

        io.emit('kaigi', { msg: player[actions[role.fort]]['name'] + "さんが無残な死体で発見されました。", userName: "GM" });
    }

    // 役職達の指定先初期化
    actions = actionInit();
    
    // プレイヤー情報を送る
    io.emit('player', { player: player, turn: turn });

    if (winer() == true) {
        // End
    } else {
        // continue
    }

};

function winer(){
    
    var werewolf=0;
    var villager=0;
    var fox=0;
    
    for(var arr in player){
        if(player[arr]['live'] == true){
            if(player[arr]['role'] == role.wolf){
                werewolf++;
            }else{
                villager++;
            }
        }
    }
    
    if(werewolf >= villager){
        for(var arr in player){
            if(player[arr]['live'] == true){
                io.emit('kaigi', { msg: player[arr]['name'] + ":" + exchange[player[arr]['role']] , userName: "GM" });
                if(player[arr]['role'] == role.inum){
                    fox=1;
                }
            }
        }
        if(fox == 1){
            io.emit('kaigi', { msg: "よって、妖狐の勝利です。" , userName: "GM" });
            return true;
        }else{
            io.emit('kaigi', { msg: "よって、人狼サイドの勝利です。" , userName: "GM" });
            return true;
        }
    }else if(werewolf == 0){
        for(var arr in player){
            if(player[arr]['live'] == true){
                io.emit('kaigi', { msg: player[arr]['name'] + ":" + exchange[player[arr]['role']] , userName: "GM" });
                if(player[arr]['role'] == role.inum){
                    fox=1;
                }
            }
        }
        if(fox == 1){
            io.emit('kaigi', { msg: "よって、妖狐の勝利です。" , userName: "GM" });
            return true;
        }else{
            io.emit('kaigi', { msg: "よって、村人サイドの勝利です。" , userName: "GM" });
            return true;
        }
    }
    return false;
};

io.on('connection', function (socket) {

    var userName;

    console.log("新しい接続がありました。" + socket.id);
    
    // プレイヤー情報を送る
    io.emit('player', {player:player,turn:turn});
    
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
                    player[arr]['voted'] = 0;
                }
                sendflag = false;
                // プレイヤー情報を送る 
                io.emit('player', {player:player,turn:turn});
                break;
                
            case "/debug":
                player[2]['live']=false;
                sendflag = false;
                // プレイヤー情報を送る
                io.emit('player', {player:player,turn:turn});   
                break; 
                
            case "/nextturn":
                // ToDo：実行中のフェイズに従って呼び出す処理を分岐
                // ToDo: フェイズとカウントを初期化すること
                switch (phase) {
                    case 0: // 昼ターン中

                        break;
                    case 1: // 投票中

                        break;
                    case 2: // 夜ターン中

                        break;
                }
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
            io.emit('player', {player:player,turn:turn});
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
            io.emit('player', {player:player,turn:turn});
        }
        
        // killコマンド
        result = msg.match(/\/kill (\d+)/);
        if(result){
            player[result[1]]['live'] = false;
            
            sendflag = false;
            // プレイヤー情報を送る
            io.emit('player', {player:player,turn:turn});
        }
            
         // rebornコマンド
         result = msg.match(/\/reborn (\d+)/);
         if(result){
            player[result[1]]['live'] = true;
                
            sendflag = false;
            // プレイヤー情報を送る
            io.emit('player', {player:player,turn:turn});
         }
        
        // turnコマンド
        result = msg.match(/\/turn (\d+)/);
        if (result) {
            turn = result[1];

            io.emit('kaigi', { msg: timing(), userName: "GM" });

            sendflag = false;
            
            // ターン情報を送る
            io.emit('player', {player:player,turn:turn});
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
       
        // 名前の登録
        for (var arr in player) {
            if (player[arr]['id'] == socket.id) {
                userName = player[arr]['name'];
            }
        }
        
        // チャット送信
        // phaseが1(投票)の時はチャットを流れないようにする
        if ( sendflag && phase != 1 ) {             
            io.emit('kaigi', { msg: msg, userName: userName, turn: turn });
        }
    });
    
    // 全員の投票が終わっていればtrueが返る、そうでなければfalseが返る
    function checkVote() {
        for (var i in player) {
            if (player[i]['vote'] == -1 && player[i]['live'] == true) return false;
        }
        return true;
    };
    
    // 役職ごとの判定
    socket.on('judge',function(target){
        
        for(var arr in player){
            if(target['action']=="投票" && player[arr]['vote'] == -1 && player[arr]['id'] == socket.id){
                player[arr]['vote'] = target['target'];
                // 全員の投票が終了しているかを確認
                if(checkVote()) {
                    // 投票時間に遷移する
                    phase = 1;
                        
                    // 投票の完了処理
                    voteEnd();
                    
                }
            }
            if(target['action']=="噛む" && actions[role.wolf] == -1 && player[arr]['id'] == socket.id && player[arr]['role'] == role.wolf){
                actions[role.wolf]=target['target'];
            }
            if(target['action']=="占う" && actions[role.fort] == -1 && player[arr]['id'] == socket.id && player[arr]['role'] == role.fort){
                actions[role.fort]=target['target'];
                if(player[actions[role.fort]]['role'] == role.wolf){
                    socket.emit('kaigi', { msg: player[actions[role.fort]]['name'] + "さんは人狼サイドでした。", userName: "GM" });
                }else{
                    socket.emit('kaigi', { msg: player[actions[role.fort]]['name'] + "さんは村人サイドでした。", userName: "GM" });
                }
            }
            if(target['action']=="守る" && actions[role.hunt] == -1 && player[arr]['id'] == socket.id && player[arr]['role'] == role.hunt){
                actions[role.hunt]=target['target'];
            }
        }
        
    });

    // GMログインメッセージ
    socket.on('userName', function (msg) {
        player.push({ id: socket.id, name: msg, role: role.none, live: true, death: 0, vote: -1, voted: 0 });
        io.emit('kaigi', { msg: msg + "さんがログインしました。", userName: "GM" });

        // プレイヤー情報を送る
        io.emit('player', {player:player,turn:turn});
    });

});