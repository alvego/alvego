var
    misc = require('./misc'),
    path = require('path'),
    jade = require('jade'),
    less = require('less'),
    fs = require('fs');

module.exports.setHeader = function(req, res, next){
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
};

/*
function defaultAction(request, response){
    var file = misc.getRequestedFile(request);
    console.log('defaultAction', file);
    if (fs.existsSync(file)){
        var stream = fs.createReadStream(file, { bufferSize: 64 * 1024 });
        stream.on('error', function(e){
            console.log(e);
            misc.sendNotFound(response);
        });
        stream.pipe(response);
    } else {
        misc.sendNotFound(response);
        console.log("ERR: Couldn't find " + file + ", returning 404!");
    }
    return false;
}

function cssAction(request, response){
    var file = misc.getRequestedFile(request);
    console.log('cssAction', file);
    var lessFile = file.replace(/.css$/, '.less');
    if (fs.existsSync(lessFile)){

        var lessErr = function(err){
            console.log(err);
            misc.sendHead(response, file);
            var message = "LESS Error!";
            if (err){
                message = 'LESS ' + err.type + ' Error: ' + err.message.replace('\'', '`') + ' (file '+ err.filename + ', line ' + err.line + ')';
            }
            response.end( 'body:before { color:red; content:\'' + message + '\'; }');
        };

        var cssCode = fs.readFileSync(lessFile, 'utf8');
        new(less.Parser)({
            paths: [path.dirname(file)],
            filename:path.basename(lessFile),
            optimization: 0
        }).parse(cssCode, function (err, tree) {
            if (err) {
               lessErr(err);
            } else {
                try {
                    var css = tree.toCSS();
                    misc.sendHead(response, file);
                    response.end(css);
                } catch (e) {
                    lessErr(err);
                }
            }
        });
        return false;
    }
}

function htmlAction(request, response){
    var file = misc.getRequestedFile(request);
    console.log('htmlAction', file);
    var jadeFile = file.replace(/.html$/, '.jade');
    if (fs.existsSync(jadeFile)){
        try {
            var jadeCode = fs.readFileSync(jadeFile, 'utf8');
            var fn = jade.compile(
                jadeCode,
                {   pretty: true,
                    debug: false,
                    compileDebug: true,
                    filename: jadeFile
                }
            );
            var html = fn({request: request});
            misc.sendHead(response, file);
            response.end(html);
        } catch(e){
            misc.sendHead(response, '.txt');
            response.end(e.message);
        }
        return false;
    }
}

function banAction(request, response){
    var file = misc.getRequestedFile(request);
    console.log('banAction', file);
    misc.sendNotFound(response, file);
    return false;
}

function folderRedirectAction(request, response){
    var rPath = misc.getRequestedPath(request);
    var fsPath = misc.getFsPath(rPath);
    console.log('folderRedirectAction', rPath);
    if (misc.isDirRequested(fsPath)) {
        response.writeHead(302, {'Location': rPath+'/'});
        response.end();
        return false;
    }
    return true;
}
*/
