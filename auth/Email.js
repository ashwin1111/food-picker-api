var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
const dotenv = require('dotenv')
var fs = require('fs');
var handlebars = require('handlebars');

dotenv.config();

function sendEmail(username, user_id, to_email) {
    readHTMLFile('html/verify_email.html', function(err, html) {
        var template = handlebars.compile(html);
        var buttonUrl = process.env.api_url_glitch + '/auth/verify?id='+user_id;
        var replacements = {
            buttonUrl: buttonUrl,
            name: username
        };
        var htmlToSend = template(replacements);

        var request = sg.emptyRequest({
            method: 'POST',
            path: '/v3/mail/send',
            body: {
              personalizations: [
                {
                  to: [
                    {
                      email: to_email
                    }
                  ],
                  subject: 'Please verify your email - Lunch Picker'
                }
              ],
              from: {
                email: 'ashwinlaptop8@gmail.com'
              },
              content: [
                {
                  type: 'text/html',
                  value: htmlToSend
                }
              ]
            }
          });
           
          // With promise
          sg.API(request)
            .then(function (response) {
              console.log('Email delivered to', to_email, ' Status Code: ', response.statusCode);
            })
            .catch(function (error) {
              // error is an instance of SendGridError
              // The full response is attached to error.response
              console.log('Some error occured in sending email', error.response.statusCode);
            });
    });
}

var readHTMLFile = function(path, callback) {
    fs.readFile(path, {
        encoding: 'utf-8'
    }, function(err, html) {
        if (err) {
            throw err;
            callback(err);
        } else {
            callback(null, html);
        }
    });
};

module.exports = sendEmail;