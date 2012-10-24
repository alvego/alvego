var connect = require('connect'),
    actions = require('./actions');

var app = connect();

app.use(connect.logger('dev'));
app.use(connect.bodyParser());

app.use(actions.setHeader);

app.use(connect.static('public'));


app.listen(process.env.VMC_APP_PORT || 81, null);
