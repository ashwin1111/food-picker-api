var express = require('express');
var app = express();
//var db = require('./db');
global.__root = __dirname + '/';
const cors = require('cors')

app.use(cors())

app.get('/api', function(req, res) {
    res.status(200).send({ msg: 'Welcome to Lunch Picker API.'});
});

var AuthController = require(__root + 'auth/AuthController');
app.use('/api/auth', AuthController);

var Food = require(__root + 'get_list/food');
app.use('/api/food', Food);

var Preferences = require(__root + 'profile/preferences');
app.use('/api/profile/', Preferences);

module.exports = app;