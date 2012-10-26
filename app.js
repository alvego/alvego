var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    jade = require('jade'),
    less = require('less'),
    os = require('os'),
    mime = require('./mime');

var serverRoot = path.join(__dirname, 'www');
var hostPort = process.env.VMC_APP_PORT || 81;
var hostName =  os.hostname();
var host = hostName + (hostPort === 80 ? '' : ':'+hostPort);

//var requestLog = [];
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
            data = data.replace(/_host_/g, host);
            data = data.replace(/_root_/g, path.relative(file, serverRoot).replace('..', ''));
            return data;
        }
    }
    return data;
}

function isDir(fsPath){
    return fs.existsSync(fsPath) && fs.statSync(fsPath).isDirectory() ? true : false;
}

function modifyUrlPath(sourceUrl, pathModifer){
    var parsedUrl = url.parse(sourceUrl);
    parsedUrl.pathname = pathModifer(parsedUrl.pathname);
    return url.format(parsedUrl);
}
/****************************/
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


function folderRedirectAction(req, res, next){
    var rPath = url.parse(req.url).pathname;
    if (!/\/$/g.test(rPath) && isDir(path.join(serverRoot, rPath))){
        res.writeHead(302, {'Location': modifyUrlPath(req.url, function(p){return p + '/'})});
        res.end();
    } else {
        next();
    }
}

function folderIndexAction(req, res, next){
    if (/\/$/g.test(url.parse(req.url).pathname)){
        req.url = modifyUrlPath(req.url, function(p){return path.join(p, 'index.html')});
    }
    next();
}

function setHttpHeadersAction(req, res, next){
    res.setHeader('Access-Control-Allow-Origin','*');
    next();
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
        result = fn(ctx || {});
    } catch(e){
        err = e;
        result = e.message;
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
        contents: ctx || {},
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

function sendDynamicAction(req, res, next){
    var file = path.join(serverRoot, url.parse(req.url).pathname);
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
        if (fs.existsSync(file)) {
            type.parser(file, fs.readFileSync(file), null, function(err, data){
                res.writeHead(200, {
                    "Content-Type":mime(file.replace(new RegExp(ext + '$'), type.resExt))
                });
                res.end(data);
            });
        }
    } else {
        next();
    }
}


function sendStaticAction(req, res, next){
    var file = path.join(serverRoot, url.parse(req.url).pathname);
    if (fs.existsSync(file)){
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
    var next = function(err) {
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
            apply(actions[i++]);
        }
    };
    var apply = function(action) {
        //console.log(action.name, req.url);
        action(req, res, next);
    };
    next();
}).listen(hostPort);
