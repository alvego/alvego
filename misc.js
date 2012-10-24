var url = require('url'),
    path = require('path'),
    fs = require('fs');

module.exports = { };

/*
    isDirRequested: function(fsPath){
        return fs.existsSync(fsPath) && fs.statSync(fsPath).isDirectory() ? true : false;
    },

    getRequestedPath : function(request){
        return url.parse(request.url).pathname.replace('../', '');
    },

    getFsPath : function(requestedPath){
        return path.join(__dirname, cfg.public_path, requestedPath);
    },


    getRequestedFile : function(request){
        var fsPath = this.getFsPath(this.getRequestedPath(request));
        if (this.isDirRequested(fsPath)) {
            fsPath = path.join(fsPath, 'index.html');
        }
        return fsPath;
    },

    sendNotFound: function(result){
        result.writeHead(404, {
            "Content-Type":"text/plain"
        });
        result.end("404 Not Found\n");
    },

    sendHead: function SendHead(result, file){
        result.writeHead(200, {
            'Content-Type':mime(file),
            'Access-Control-Allow-Origin':'*'
        });
    }

};
 */






