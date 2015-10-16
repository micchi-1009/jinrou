/**
	server
**/
var express = require('express');
var app = express();

// wwwディレクトリを静的ファイルディレクトリとして登録
app.use(express.static('www'));

// サーバを開始
var server = app.listen(process.env.PORT||3000);