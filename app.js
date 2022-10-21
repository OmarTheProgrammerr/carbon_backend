var express = require("express"); // importing express
var app = express(); // setting app === express
var mongoose = require("mongoose");
const port = process.env.PORT || 1234;
const connection = process.env.ATLAS_URI;
var bodyParser = require("body-parser");
var MongoClient = require("mongodb").MongoClient;
var bcrypt = require("bcrypt-nodejs"); // for encrypting the password
var cors = require('cors')

app.use(cors())

//connecting to the DB
mongoose.connect(
  "mongodb+srv://GreenMail:carbon_hack22@cluster0.txn0age.mongodb.net/?retryWrites=true&w=majority"
);
var rez = 0; // so 0 means an error 404 and 1 is working just fine 200
//creating a Schema
var Schema = mongoose.Schema;
var usersSchema = new Schema({
  FullName: String,
  OrganizationName: String,
  Email: String,
  Password: String,
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

app.get("/signup/add", function (req, res, next) {
  console.log("Request Url:" + req.url);

  User.findOne({ email: req.query.email }, function (err, users) {
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
  User.findOne({ email: req.body.email }, function (err, users) {
    if (err) console.log(err);

    // object of all the users
    console.log(users);
    if (/*!users*/false) {
      res.status(408).send(); // shut down this unused connection!
    } else {
      var newUser = new User();
      newUser.FullName = req.body.FullName;
      newUser.OrganizationName = req.body.OrganizationName;
      newUser.Email = req.body.Email;
      newUser.Password = newUser.encryptPassword(req.body.password);

      newUser.save(function (err) {
        if (err) throw err;

        res.end();
        console.log("User has been Created and saved, Wohoo!!");
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
