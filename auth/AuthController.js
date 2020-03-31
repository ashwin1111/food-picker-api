var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var VerifyToken = require('./VerifyToken');
var email = require('./Email');
router.use(bodyParser.urlencoded({
    extended: false
}));
router.use(bodyParser.json());
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var config = require('../config');
const uuidv4 = require('uuid/v4');
const {
    Pool, Client
} = require('pg')
var validator = require('email-validator');
var passwordValidator = require('password-validator');
var schema = new passwordValidator();
const dotenv = require('dotenv')

dotenv.config()

const pool = new Pool({
    user: `${process.env.user}`,
    host: `${process.env.host}`,
    database: `${process.env.database}`,
    password: `${process.env.password}`,
    port: '5432',
    ssl: true
});

router.post('/login', async function(req, res) {
    try {
        schema
            .has().not().spaces() // Should not have spaces
            // .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values
        if (!schema.validate(req.body.password)) {
            return res.status(404).send({
                msg: "Incorrect credentials / Password badly formatted"
            });
        }
        const client = await pool.connect()
        await JSON.stringify(client.query('SELECT * FROM users WHERE "email"=$1', [req.body.email], function(err, result) {
            if (!result.rows[0]) {
                return res.status(404).send('No user found with the given email / password')
            } else {
                var encryptedPassword = result.rows[0].password;
                var passwordIsValid = bcrypt.compareSync(req.body.password, encryptedPassword);
                if (!passwordIsValid) return res.status(404).send({
                    auth: false,
                    token: null,
                    msg: 'Email / Password is wrong'
                });

                if (result.rows[0].verified === true) {
                    var token = jwt.sign({
                        id: req.body.email
                    }, config.secret, {
                        expiresIn: 86400
                    });

                    return res.status(200).send({
                        auth: true,
                        token: token,
                        user: result.rows[0]
                    });
                } else {
                    return res.status(200).send({
                        auth: false,
                        token: null,
                        msg: 'Account not verified'
                    })
                }
            }
        }));
        client.release();
    } catch (e) {
        throw (e)
    }
});

router.get('/logout', function(req, res) {
    res.status(200).send({
        auth: false,
        token: null
    });
});

router.post('/register', async function(req, res) {
    try {
        if (!validator.validate(req.body.email)) {
            return res.status(404).send("Email badly formatted");
        }
        schema
            .is().min(2) // Minimum length 8
            .is().max(20) // Maximum length 100
            .has().uppercase() // Must have uppercase letters
            .has().lowercase() // Must have lowercase letters
            //.has().digits()                                 // Must have digits
            .has().not().spaces() // Should not have spaces
            // .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values
        if (!schema.validate(req.body.password)) {
            return res.status(404).send({
                msg: "Weak password"
            });
        }
        const client = await pool.connect()
        var pwd = await bcrypt.hashSync(req.body.password, 8);
        var id;
        await JSON.stringify(client.query('SELECT id FROM users WHERE "email"=$1', [req.body.email], async function(err, result) {
            if (result.rows[0]) {
                return res.status(403).send({
                    auth: false,
                    token: null,
                    msg: "Email already exists"
                });
            } else {
                id = await uuidv4();
                client.query('INSERT INTO users (id, "name", email, password, verified, created_at) VALUES ($1, $2, $3, $4, false, now())', [id, req.body.name, req.body.email, pwd], function(err, result) {
                    if (err) {
                        return res.status(500).send(err)
                    } else {
                        client.query('COMMIT')
                        email(req.body.name, id, req.body.email)
                        return res.status(200).send({
                            auth: true,
                            token: null,
                            msg: 'User registered successfully'
                        });
                    }
                });
            }

        }));
        client.release();
    } catch (e) {
        throw (e)
    }
});

router.post('/refresh_token', async function(req, res, next) {
    var token = jwt.sign({
        id: req.body.email
    }, config.secret, {
        expiresIn: 86400
    });
    return res.status(200).send({
        auth: true,
        token: token
    });
});

router.get('/me', VerifyToken, async function(req, res, next) {
    try {
        const client = await pool.connect()
        await JSON.stringify(client.query('SELECT * FROM users WHERE "email"=$1', [req.userId], function(err, result) {
            if (result.rows[0]) {
                return res.status(200).send(result.rows[0]);
            } else if (err) {
                return res.status(500).send("There was a problem finding the user.");
            } else {
                return res.status(404).send("No user found.");
            }
        }));
        client.release();
    } catch (e) {
        throw (e)
    }
});

router.get('/verify', async function(req, res, next) {
    try {
        const {
            id
        } = req.query
        const client = await pool.connect()
        await JSON.stringify(client.query('SELECT id FROM users WHERE "id"=$1', [id], async function(err, result) {
            if (result.rows[0]) {
                if (id === result.rows[0].id) {
                    await JSON.stringify(client.query('update users set verified = true where "id"=$1', [id], async function(err, result) {
                        return res.status(200).send("Account verified successfully");
                    }))
                } else {
                    return res.status(500).send("Verification failed due to wrong");
                }
            } else if (err) {
                return res.status(500).send("There was a problem finding the user.");
            } else {
                return res.status(404).send("Some unknown error occured during verification.");
            }
        }));
        client.release();
    } catch (e) {
        throw (e)
    }
});

router.post('/register/user_details', VerifyToken, async function (req, res) {
    try {
        var email = req.userId;
        console.log('req.body.mobile_number', req.body.mobile_number);
        const client = await pool.connect();
                client.query('UPDATE users set "first_name"=$1, "last_name"=$2, age=$3, gender=$4, "city"=$5, mobile_number=$6, first_login=$7 where email=$8', [req.body.first_name, req.body.last_name, req.body.age, req.body.gender, req.body.city, req.body.mobile_number, false, email], function(err, result) {
                    if (err) {
                        console.log('err',err)
                        return res.status(500).send(err)
                    } else {
                        client.query('select * from users where email=$1', [email], function (err, result){
                            return res.status(200).send({
                                auth: true,
                                token: null,
                                msg: 'User details registered successfully',
                                user_details: result.rows[0]
                            });
                        });
                    }
                });
            client.release();
    } catch (e) {
        throw (e)
    }
});

module.exports = router;