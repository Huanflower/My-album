// 开启严格模式
`use strict`;
// 1：引入对象
const express = require('express');
//解析post请求体数据
const bodyParser = require('body-parser');
//文件功能增强的包
const fse = require('fs-extra');
//解析上传文件的包
const formidable = require('formidable');
//引入path核心对象
const path = require('path');
// 数据库连接
const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: 'zhaohuan',
    database: 'album'
});
//2、创建服务器
let app = express();
//配置模板引擎
app.engine('html',require('express-art-template'));
//配置路由规则
let router = express.Router();
// 测试路由
router.get('/test',(req,res,next)=>{
    // 获取连接
    pool.getConnection(function(err,connection){
        //从数据库查询数据
        connection.query('SELECT * FROM  album_dir',function(error,results,fields){
        //    释放连接
            connection.release();
           if(error) throw error;
           res.render('test.html',{
               text: results[2].dir
           }) ;
        });
    });
})
// 显示相册列表
.get('/',(req,res,next)=>{
    pool.getConnection((err,connection)=>{
        if(err) return next(err);

        connection.query('SELECT * FROM  album_dir',  (error, results) =>{
            //    释放连接
            connection.release();
            if (error) throw error;
            res.render('index.html', {
                album:results
            });
        });
    });
})
// 显示照片列表
.get('/showDir',(req,res,next)=>{
    let dirname = req.query.dir;
    pool.getConnection((err,connection)=>{
        if(err) return next(err);

        connection.query('SELECT * FROM  album_file where dir =?', [dirname], (error, results)=> {
            //    释放连接
            connection.release();
            if (error) throw error;
            res.render('album.html', {
               album:results,
               dir: dirname
            });
        });
    })
})
// 添加目录
.post('/addDir',(req,res,next)=>{
    let dirname = req.body.dirname;
    console.log(req.body);
    pool.getConnection((err,connection)=>{
        if(err) return next(err);
        connection.query('insert into  album_dir values (?)',[dirname], (error, results)=> {
            //    释放连接
            connection.release();
            
            if(error) throw error;

            const dir =  `./resource/${dirname}`;
            fse.ensureDir(dir,err =>{
                res.redirect('/showDir?dir='+dirname);
            });
        })
    });
})
// 添加照片
.post('/addPic',(req,res,next)=>{
    var form = new formidable.IncomingForm();

    let rootPath = path.join(__dirname,'resource');

    form.uploadDir = rootPath;
    form.parse(req,function(err,fields,files){
        if(err) return next(err);

        let filename = path.parse(files.pic.path).base;

        let dist = path.join(rootPath,fields.dir,filename);
        fse.move(files.pic.path,dist,(err)=>{
            if(err) return next(err);

            let  db_file = `/resource/${fields.dir}/${filename}`;
            let db_dir = fields.dir;

           pool.getConnection((err, connection) => {
               if (err) return next(err);
               connection.query('insert into album_file values (?,?)', [db_file,db_dir], (error, results) => {
                   connection.release();

                   if (error) throw error;

                  res.redirect('/showDir?dir='+db_dir);
               })
           });
        })
    });
});

app.use('/public',express.static('./public'));
// 向外暴露相片静态资源目录
app.use('/resource',express.static('./resource'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));
// parse application/json
app.use(bodyParser.json());

//4：处理请求响应数据
app.use(router);

// 错误处理
app.use((err,req,res,next)=>{
    console.log('出错了-------');
    console.log(err);
    console.log('出错了-------');
    res.send(`
        您要访问的页面出异常了。。。请稍后再试。。。
        <a href="/">去首页玩</a>
    `);
})
//3：监听端口
app.listen(8888,()=>{
    console.log('服务器启动了');
});