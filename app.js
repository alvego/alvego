var connect = require('connect'),
	path = require('path');

var app = connect()
  .use(connect.logger('dev'))
  .use(connect.bodyParser())
  .use(function(req, res, next){
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
  })
  .use(function(req, res, next){
    if (req.url == '/build/' && req.method == 'POST') {
            console.log(req.body);
 			res.writeHead(200, {
              'Content-Type':'text/css',
              'Access-Control-Allow-Origin':'*'
            });
            res.end("#art-main {background:" + req.body.value + '; }');
          
    } else {
      next();  
    }
  })
  .use(connect.static('public'))
  .listen(process.env.VMC_APP_PORT || 81, null);
