var app = require('./app');
var port = process.env.PORT || 3003;

var server = app.listen(port, function() {
    console.log('Lunch Picker listening on port ' + port);
});