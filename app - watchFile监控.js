var express = require('express');
var router = express.Router();
var reactViews = require('express-react-views');
var bodyParser = require('body-parser');
var fs = require('fs');
var ip = require('ip');

var app = express();
const dir = '/data/api.txt';

app.set('views', __dirname + '/views');
app.set('view engine', 'jsx');
app.engine('jsx', reactViews.createEngine());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//数组去重
function removeDuplicatedItem(arr) {
	for (var i = 0; i < arr.length - 1; i++) {
		for (var j = i + 1; j < arr.length; j++) {
			if (arr[i].substring(0, arr[i].indexOf(" {")) == arr[j].substring(0, arr[j].indexOf(" {"))) {
				arr.splice(i, 1);
				j--;
			}
		}
	}
	return arr;
}

//设置跨域访问
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	// res.header("X-Powered-By",' 3.2.1')
	// res.header("Content-Type", "application/json;charset=utf-8");
	next();
});


app.get('/', function (req, res, next) {
	res.render('index', { title: 'admin', msg: "@tawen" });
});

app.get('/api', function (req, res, next) {
	res.render('api_post', { title: 'API POST', msg1: "url example: /tawen", msg2: "json example: {\"name\":\"tawen\",\"blogurl\":\"http:\/\/tawen.github.io\"}" });
});



var url_json_list = {};//url json list
var url_list = new Array(); //url list

//验证url
function is_valid_url(url) {
	if (url == null || url == "") return false;
	if (url.indexOf("/") != 0) return false;
	if (url.indexOf(" ") > 0) return false;
	let path_arr = url.split("/");
	for (let i = 1; i < (path_arr.length - 1); i++) {
		let item = path_arr[i];
		if (item == null || item == "") return false;
	}
	return true;
}

function is_reserved_url(url) {
	return url == "/" || url == "/api" || url == "/api/post" || url == "/api/list";
}

function is_valid_json(data) {
	if (data == null || data == "") return false;
	try {
		JSON.parse(data);
	} catch (e) {
		return false;
	}
	return true;
}
function readFile(){
	fs.readFile(__dirname + dir, { flag: 'r+', encoding: 'utf8' }, function (err, data) {
		if (err) {
			console.error(err);
			return;
		}
		var reg = "END\n";
		var api_array = removeDuplicatedItem(data.split(reg));
		api_array.map(function (item) {
			var index = item.indexOf(" {");
			if (index > 0) {
				var parms = item.substring(0, index);
				var i = parms.indexOf(" ");
				var method = parms.substring(0, i);
				var url = item.substring(i + 1, index);
				var json = item.substring(index + 1, item.length);
				if (is_valid_url(url) && is_valid_json(json)) {
					url_json_list[method + url] = json;
					url_list.push({ url: url, method: method });
					app[method](url, function (req, res) {
						res.json(JSON.parse(url_json_list[method + url]));
					});
				}
			}
	
		})
		//console.warn(url_json_list);
	});
}
readFile();

fs.watchFile(__dirname + dir, (cur, prv) => {
	if (__dirname + dir) {
	 // 打印出修改时间
	 console.log(`cur.mtime>>${cur.mtime.toLocaleString()}`)
	 console.log(`prv.mtime>>${prv.mtime.toLocaleString()}`)
	 // 根据修改时间判断做下区分，以分辨是否更改
	 if (cur.mtime != prv.mtime){
		readFile();
		console.log(`${__dirname + dir}文件发生更新`)
	 }
	}
 })

app.get('/api/list', function (req, res, next) {
	res.render('api_list', { title: 'API LIST', json_list: url_list });
});


app.post('/api/post', function (req, res, next) {
	if (req.body.url_path == null || req.body.json_text == null) {
		res.render('api_tips', { title: 'TIPS', msg: "url and json can not be null" });
		return
	};
	let url_path = req.body.url_path.trim().toLowerCase();
	let method = req.body.method.trim().toLowerCase();
	let json_text = req.body.json_text.trim();
	if (!is_valid_url(url_path)) {
		res.render('api_tips', { title: 'TIPS', msg: "error url!\nurl: " + url_path });
		return
	}

	if (is_reserved_url(url_path)) {
		res.render('api_tips', { title: 'TIPS', msg: "url is reserved! url cannot be [/, /api, /api/post, /api/list]" });
		return
	}

	if (!is_valid_json(json_text)) {
		res.render('api_tips', { title: 'TIPS', msg: "error json!\njson: " + json_text });
		return
	}
	if (method + url_path in url_json_list) {
		var jsonStr = JSON.stringify(JSON.parse(json_text));
		url_json_list[method + url_path] = json_text;
		//TODO UPDATE FILE
		fs.appendFile(__dirname + dir, "END\n" + method + " " + url_path + " " + jsonStr, function () {
			console.log('edit success:' + req.body.url_path);
		});
	} else {
		var jsonStr = JSON.stringify(JSON.parse(json_text));
		url_json_list[method + url_path] = jsonStr;
		url_list.push({ "method": method, "url": url_path });
		fs.appendFile(__dirname + dir, "END\n" + method + " " + url_path + " " + jsonStr, function () {
			console.log('add success:' + req.body.url_path);
		});
		app[method](url_path, function (req1, res1) {
			console.log(url_json_list[method + url_path])
			res1.json(JSON.parse(url_json_list[method + url_path]));
		})
	}


	res.render('api_tips', { title: 'TIPS', msg: "add success!", url: url_path });
});


var server = app.listen(8892, function () {
	console.log('app listening at post ' + ip.address() + ':8892');
});