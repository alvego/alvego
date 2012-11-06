var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    jade = require('jade'),
    less = require('less'),
    mime = require('./mime');

var serverRoot = path.join(__dirname, 'www');
var hostPort = process.env.VMC_APP_PORT || 81;
var hostName =  process.env.VMC_APP_PORT ? 'alvego.pp.ua' : 'localhost:81';
var existsSync = fs.existsSync || path.existsSync;

/******************************/
var dynamics = [
    {
        resExt:'html',
        fsExt:'jade',
        parser:jadeParser
    },
    {
        resExt:'css',
        fsExt:'less',
        parser:lessParser
    }
];


fs._readFileSync = fs.readFileSync;
fs.readFileSync = function(path, encoding) {
    return fsFilter(path, fs._readFileSync(path, encoding));
}

fs._readFile = fs.readFile;
fs.readFile = function(file, encoding_) {
    var encoding = typeof(encoding_) === 'string' ? encoding_ : null;
    var callback = arguments[arguments.length - 1];
    fs._readFile(file, encoding, function(err, data){
        if (!err) {
            data = fsFilter(file, data);
        }
        callback(err, data);
    });
}

function fsFilter(file, data)
{
    for(var i = 0, l = dynamics.length; i<l; i++) {
        var t = dynamics[i];
        if (path.extname(file).substr(1) === t.fsExt) {
            data = ''+data;
            data = data.replace(/^(\s*)\|\s/gm, "$1|#{' '}");
            data = data.replace(/_host_/g, hostName);
            data = data.replace(/_root_/g, path.relative(file, serverRoot).replace('..', ''));
            return data;
        }
    }
    return data;
}

function scanPages(pages, rPath){
    var fsPath = path.join(serverRoot, rPath);
    if (isDir(fsPath)) {
        var file = path.join(fsPath, 'index.jade');
        if (existsSync(file)) {
           pages[rFolder(rPath)] = getJadeMeta(file, fs.readFileSync(file));
        }
        fs.readdirSync(fsPath).forEach(function(file){
            if (isDir(path.join(fsPath, file))) {
                scanPages(pages, path.join(rPath, path.basename(file)));
            }
        });
    }
}

var pages = {}
scanPages(pages, '/');

function rFolder(p){
   return p.replace(/\\/g, '/').replace(/([^\/]{1,})$/g, '$1/');
}

function getPages(rPath)
{
    rPath = rFolder(rPath);
    var result = [];
    Object.keys(pages).forEach(function(p){
         if ((new RegExp('^'+rPath+'[^/\]{1,}/\$')).test(p)) {
             result.push({
                 path:p,
                 url:'http://'+hostName + p,
                 name:path.basename(p),
                 page: pages[p],
                 pages:getPages(p)
             });
         }
    });

    return result;
}

var nav = getPages(path.dirname('/'));

function isDir(fsPath){
    return existsSync(fsPath) && fs.statSync(fsPath).isDirectory() ? true : false;
}

function modifyUrlPath(sourceUrl, pathModifer){
    var parsedUrl = url.parse(sourceUrl);
    parsedUrl.pathname = pathModifer(parsedUrl.pathname);
    return url.format(parsedUrl);
}
/****************************/
//var requestLog = [];
/*function requestLogAction(req, res, next){

    if (requestLog.length > 999) {
        requestLog.shift();
    }

    requestLog.push({
        request: req.method + ' ' + req.url,
        ip: req.connection.remoteAddress,
        useragent: req.headers['user-agent'],
        time: new Date().toUTCString()
    });

    if (url.parse(req.url).pathname === '/log'){
        res.writeHead(200, {'Content-Type':'text/plain'});
        res.end(JSON.stringify(requestLog, null, 4));
    } else {
        next();
    }
}*/

var faviconData = null;
function faviconAction(req, res, next){
    var rPath = url.parse(req.url).pathname;
    var fPath = '/favicon.ico';
    var fsPath = path.join(serverRoot, fPath);
    var send = function(data) {
        res.writeHead(200, {"Content-Type":mime(fPath)});
        res.end(data);
    }
    if (rPath === fPath) {
        if (faviconData === null && existsSync(fsPath)){
            faviconData = fs.readFileSync(fsPath);
        }
        if (faviconData !== null) {
            send(faviconData)
            return
        }
    }
    next();
}

var libsCache = {};
function libsAction(req, res, next){
    var rPath = url.parse(req.url).pathname;
    if (/^\/libs\//g.test(rPath)){
        var fsPath = path.join(__dirname, rPath);
        if ('undefined' === typeof libsCache[fsPath] && existsSync(fsPath) && !isDir(fsPath)){
            libsCache[fsPath] = fs.readFileSync(fsPath);
        }
        if ('undefined' !== typeof libsCache[fsPath]) {
            res.writeHead(200, {"Content-Type":mime(fsPath)});
            res.end(libsCache[fsPath]);
            return;
        }
        notFoundAction(req, res, next)
        return;
    }
    next();
}

function folderRedirectAction(req, res, next){
    var rPath = url.parse(req.url).pathname;
    var fsPath = path.join(serverRoot, rPath);
    if (!/\/$/g.test(rPath) && existsSync(fsPath) &&  isDir(fsPath)){
        res.writeHead(302, {'Location': modifyUrlPath(req.url, function(p){return p + '/'})});
        res.end();
    } else {
        next();
    }
}

function folderIndexAction(req, res, next){
    var rPath = url.parse(req.url).pathname;
    if (/\/$/g.test(rPath)){
        req.url = modifyUrlPath(req.url, function(p){return path.join(p, 'index.html')});
    } else {
        var fsPath = path.join(serverRoot,rPath);
        if (!existsSync(fsPath) && existsSync(fsPath + '.jade')) {
            req.url = modifyUrlPath(req.url, function(p){return p + '.html'});
        }
    }
    next();
}

function setHttpHeadersAction(req, res, next){
    res.setHeader('Access-Control-Allow-Origin','*');
    next();
}

function getJadeMeta(file, data) {
    var result = {};
    data = ''+data;
    var re = /^\/\/-\s*(\w{1,}):\s*(.*)\s*$/gm;
    var m;
    while(m = re.exec(data)) {
       result[m[1]] = m[2];
    }

    if ('undefined' === typeof result.title) {
        result.title =  path.basename(file, '.jade');
        if (result.title === 'index') {
            var dir = path.dirname(file);
            if (dir !== serverRoot) {
                result.title = path.basename(dir);
            }
        }
    }

    if ('undefined' === typeof result.date) {
        var pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };
        var d = fs.statSync(file).mtime;
        result.date = [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('.');
    }
    return result;
}

function jadeParser(file, data, ctx, back) {
    var err = null,
        result = '';
    try {
        var fn = jade.compile(
            data,
            {   pretty: true,
                debug: false,
                compileDebug: true,
                filename: file
            }
        );

        ctx.page = getJadeMeta(file, data);
        ctx.path = rFolder(path.dirname(ctx.url));
        ctx.host = 'http://'+hostName;
        ctx.url = ctx.host+ctx.path;
        ctx.pages = getPages(ctx.path);
        ctx.nav = nav;
        result = fn(ctx);
    } catch(e){
        err = e;
        result = '<pre>' + e.message + '</pre>';
    }
    back(err, result);
}

function lessParser(file, data, ctx, back) {
    var result = '';
    var lessErr = function(err){
        var message = "LESS Error!";
        if (err){
            message = 'LESS ' + err.type + ' Error: ' + err.message.replace('\'', '`') + ' (file '+ err.filename + ', line ' + err.line + ')';
        }
        return  'body:before { color:red; content:\'' + message + '\'; }';
    };
    new(less.Parser)({
        paths: [path.dirname(file)],
        filename:path.basename(file),
        contents: ctx,
        optimization: 0
    }).parse(''+data, function (err, tree) {
        if (err) {
            back(err, lessErr(err));
            return;
        }
        try {
            result = tree.toCSS();
        } catch (e) {
            back(e, lessErr(e));
            return;
        }
        back(null, result);
    });

}

var dynamicCache = {};
function sendDynamicAction(req, res, next){
    var rPath = url.parse(req.url).pathname;
    var file = path.join(serverRoot, rPath);
    var ext = path.extname(file).substr(1);
    var type = null;
    for(var i = 0, l = dynamics.length; i<l; i++) {
        var t = dynamics[i];
        if (ext === t.resExt || ext === t.fsExt) {
            type = t;
        }
    }
    if (type) {
        if (ext === type.resExt) {
            file = file.replace(new RegExp(ext + '$'), type.fsExt);
            ext = type.fsExt;
        }

        var send =  function(data){
            res.writeHead(200, {
                "Content-Type":mime(file.replace(new RegExp(ext + '$'), type.resExt))+'; charset=utf-8'
            });
            res.end(data);
        };


        if (process.env.VMC_APP_PORT && 'undefined' !== typeof dynamicCache[file]) {
            send(dynamicCache[file]);
            console.log('from cache:', file);
            return;
        }

        if (existsSync(file)) {
            var ctx = {url: rPath};
            type.parser(file, fs.readFileSync(file), ctx, function(err, data){
                dynamicCache[file] = data;
                send(data);
            });
        } else {
           next();
        }
    } else {
        next();
    }
}


function sendStaticAction(req, res, next){
    var file = path.join(serverRoot, url.parse(req.url).pathname);
    if (existsSync(file)){
        res.writeHead(200, {'Content-Type':mime(file) });
        var stream = fs.createReadStream(file, { bufferSize: 64 * 1024 });
        stream.on('error', function(err){
            next(err);
        });
        stream.pipe(res);
    } else {
        next();
    }
}

function notFoundAction(req, res, next){
    res.writeHead(404, {
        "Content-Type":"text/plain"
    });
    res.end("404 Not Found\n");
}

var actions = [
    //requestLogAction,
    faviconAction,
    libsAction,
    folderRedirectAction,
    folderIndexAction,
    setHttpHeadersAction,
    sendDynamicAction,
    sendStaticAction,
    notFoundAction
];

// Create a new HTTP server
http.createServer(function (req, res) {
    var i = 0;
    function next(err) {
        if (err) {
            console.log(err);
            if (!res.finshed) {
                res.writeHead(500, {
                    "Content-Type":"text/plain"
                });
                res.end("500 Internal Server Error\n");
            }
            return;
        }

        if (!res.finished && i < actions.length) {
            var action = actions[i++];
            //console.log(action.name, req.url);
            action(req, res, next);
        }
    };
    next();
}).listen(hostPort);
