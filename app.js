var express = require("express"); // importing express
var app = express(); // setting app === express
var mongoose = require("mongoose");
const port = process.env.PORT || 1234;
const connection = process.env.ATLAS_URI;
var bodyParser = require("body-parser");
var MongoClient = require("mongodb").MongoClient;
var bcrypt = require("bcrypt-nodejs"); // for encrypting the password
var cors = require('cors')
var jwt = require('jsonwebtoken');
var dotenv = require('dotenv');
var crypto = require('crypto');
var request = require('request');
var axios = require('axios');
var AWS = require('aws-sdk');

dotenv.config();

app.use(cors())

//connecting to the DB
mongoose.connect(process.env.ATLAS_URI);
var rez = 0; // so 0 means an error 404 and 1 is working just fine 200
//creating a Schema
var Schema = mongoose.Schema;
var usersSchema = new Schema({
  FullName: String,
  OrganizationName: String,
  Email: String,
  Password: String,
  NewsletterString: String,
});
var letterSchema = new Schema({
    Subject: String,
    Body: String,
    SendDate: String,
    BoundTo: String,
    MailingListString: String,
});
var subscriptionsSchema = new Schema({
    MailingListString: String,
    Subscribers: [String]
});

usersSchema.methods.encryptPassword = (Password) => {
  // this is just for security so no Hackers can get to the password just like what happened at Uber :)
  return bcrypt.hashSync(Password, bcrypt.genSaltSync(10), null); // return the hashed password
};

usersSchema.methods.validPassword = function (password) {
  // compare and check if its a valid password
  return bcrypt.compareSync(password, this.password);
};

// parse application/x-www-form-urlencoded;
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

//creating a model in mongodb
var User = mongoose.model("Users", usersSchema);
var Letter = mongoose.model("Letters", letterSchema);
var Subscriptions = mongoose.model("Subscriptions", subscriptionsSchema);

app.get("/signup/add", function (req, res, next) {
  console.log("Request Url:" + req.url);

  User.findOne({ Email: req.query.email }, function (err, users) {
    if (err) console.log(err);
    console.log(users);
    if (users) {
      res.status(200).send(); // its working just fine
      rez = 1;
      console.log(rez);
    } else {
      res.status(404).send(); // it not it
      console.log(rez);
    }
  });
});

app.post("/signup/add", function (req, res, next) {
  console.log("Request Url:" + req.url);
  console.log(req.body);
  User.findOne({ Email: req.body.Email }, function (err, users) {
    if (err) {
      res.json(err);
    }
    if (users) {
      res.status(408).json({ msg: `${req.body.Email} already in database.` });
      res.status(408).send(); // shut down this unused connection!
    } else {
      var newUser = new User();
      newUser.FullName = req.body.FullName;
      newUser.OrganizationName = req.body.OrganizationName;
      newUser.Email = req.body.Email;
      newUser.Password = newUser.encryptPassword(req.body.password);
      newUser.NewsletterString = crypto.randomBytes(8).toString('hex');

      newUser.save(function (err) {
        if (err) throw err;

        res.end();
        console.log("User has been Created and saved, Wohoo!!");
      });
    }
  });
});

app.post('/login', (req, res, next) => {
  User.findOne({ Email: req.body.Email }, (err, user) => {
    if (err) {
      res.json(err)
    }
    if (user == null) {
      res.status(404).json({ msg: `${req.body.Email} not found in database.` })
    } else {
      let payload = {
        FullName: user.FullName,
        OrganizationName: user.OrganizationName,
        Email: user.Email,
        NewsletterString: user.NewsletterString
      }
      res.status(200).json(jwt.sign(payload, process.env.JWT_KEY, { expiresIn: "12 hours" }))
    }
  })
});

app.post('/saveletter', (req, res, next) => {
    // Make letter
    var letter = new Letter();
    letter.Subject = req.body.Subject;
    letter.Body = req.body.Body;
    letter.SendDate = req.body.SendDate;
    const decodedToken = jwt.decode(req.body.jwt)
    letter.MailingListString = decodedToken.NewsletterString;
    letter.BoundTo = decodedToken.Email;
    letter.save((err) => {
        if (err) res.json(err);
        else res.json(letter);
    })
});

app.get('/subscribe', (req, res, next) => {
    Subscriptions.findOne({MailingListString: req.query.MailingListString}, (err, subs) => {
        if(err) res.json(err);
        else if(subs == null){
            // if subscriptions list doesn't exist, make one and add the subscriber
            var newsubs = new Subscriptions();
            newsubs.MailingListString = req.query.MailingListString;
            newsubs.Subscribers.push(req.query.Email);
            newsubs.save((err) => {
                if(err) res.json(err);
                else res.json(subs);
            });
        } else {
            // if subscriptions list does exist, add the subscriber to it
            subs.Subscribers.push(req.query.Email);
            subs.save((err) => {
                if(err) res.json(err);
                else res.json(subs);
            });
        }
    })
});

const sendMailFromOptimalLocation = (mailObject) => {
    request('https://carbon-aware-api.azurewebsites.net/emissions/bylocations/best?location=eastus&location=westus', (error, response, body) => {
        if (JSON.parse(body)[0].location === 'CAISO_NORTH') {
            // us-west is best, would send mail through this location
        } else {
            // us-east is best, would send mail through this location
        }
    })
    // we only have one AWS account, so I'm just gonna send it through us-east every time.

    AWS.config.update({accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region:"us-east-2"}) // since we only have one account, we must use us-east-2 for all sending. 

    // TODO: replace subject, body, and recipient data with data from mailObject argument

    let lambda = new AWS.Lambda();
    let params = {
        FunctionName: "sendMail",
        Payload: JSON.stringify({
            subject: "my loveliest subject",
            body: "my lovelier body",
            recipient: "azadeganmalek@gmail.com"
        })
    }
    lambda.invoke(params, (err, data) => {
        if (err) console.log(err, err.stack)
        else console.log(data)
    })
}

app.get('/test', (req, res, next) => {
    sendMailFromOptimalLocation()
    res.json({msg: "done"})
})

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
