/**
 * 模块依赖
 */

var express = require("express"),
    mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectID;

/**
 * 构建应用程序
 */
var app = express.createServer();


/**
 * 中间件
 */
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: 'my secret'}));

//身份验证中间件
app.use(function (req, res, next) {
    if (req.session.loggedIn) {
        res.local('authenticated', true);
        //app.users.findOne({_id: {$oid: req.session.loggedIn}}, function (err, doc) {
        app.users.findOne({"_id": ObjectId(req.session.loggedIn)}, function(err, doc) {
            if (err) return next(err);
            res.local('me', doc);
            next();
        })
    } else {
        res.local('authenticated', false);
        next();
    }
});

//模板路径
app.set('views', './views/pages');

/**
 * 连接数据库
 */
var server = new mongodb.Server('127.0.0.1', 27017);
new mongodb.Db('my-website', server).open(function (err, client) {

    //如果失败,终止进程
    if (err) throw err;

    //连接成功,打印成功信息
    console.log('\033[96m + \033[39m connected to mongodb');

    //建立连接
    app.users = new mongodb.Collection(client, 'users');

    //建立索引
    client.ensureIndex('users', 'email', function (err) {
        if (err) throw err;

        client.ensureIndex('users', 'password', function (err) {
            if (err) throw err;

            console.log('\033[96m + \033[39m ensured indexes');

            //监听端口
            app.listen(3000, function () {
                console.log('\033[96m + \033[39m app listening on *:3000');
            });
        })
    });
});

/**
 * 指定视图选项
 */
app.set('view engine', 'jade');

//若使用了Express 3,则不需要下面这行代码
app.set('view options', {layout: false});


/**
 * 路由
 */

//默认路由
app.get('/', function (req, res) {
    res.render('index');
});

//登录路由
app.get('/login', function (req, res) {
    res.render('login', {signupEmail: ''});
});

app.get('/login/:signupEmail', function (req, res) {
    res.render('login', {signupEmail: req.params.signupEmail});
});

app.post('/login', function (req, res) {
    app.users.findOne({email: req.body.user.email, password: req.body.user.password}, function (err, doc) {
        if (err) return next(err);
        if (!doc) return res.send('<p>用户名或密码错误</p>');
        req.session.loggedIn = doc._id.toString();
        res.redirect('/');
    });
});


//注册路由
app.get('/signup', function (req, res) {
    res.render('signup');
});

app.post('/signup', function (req, res, next) {
    app.users.insert(req.body.user, function (err, doc) {

        //如果遇到错误,调用next,这样就快要显示一个"错误500"页面
        if (err) return next(err);

        //插入数据成功后,重定向到登录页,并传email的值过去
        res.redirect('/login/' + doc[0].email);
    });
});

//退出登录
app.get('/logout',function(req,res){
    req.session.loggedIn=null;
    res.redirect('/');
});