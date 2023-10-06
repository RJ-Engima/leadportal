const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
var bodyParser = require("body-parser");
const hbs = require("express-handlebars");
var log = require("./config/log");
const path = require("path");
const cookieParser = require("cookie-parser");
var session = require("express-session");
var csrf = require("csurf");
const helmet = require("helmet");
const args = require('yargs')
const port = 8080

// args.command({
//   command: "config",
//   describe: "Please provide environment",
//   builder: {
//     env: {
//       describe: "Environment=prod, uat, dev",
//       demandOption: true,
//       type: "string",
//     },
//   },
//   handler: function (argv) {
//     log.warn("Server started at with Environment :: " + argv.env);
//     require("dotenv").config({ path: "./lead" + argv.env + ".env" });
//   },
// }).demandCommand(1, "You need at least one command to start the application");
// args.parse();

let whitelist
if(process.env.ENV === "DEV"){
  whitelist = ["https://staging.m2pfintech.com", "https://staging.livquik.com","https://m2pfintech.com", "http://localhost:1600","http://localhost:5500","http://localhost:3000","http://localhost:5505","https://connect.m2pfintech.com","https://livquik.com"]
}else{
  whitelist = ["https://m2pfintech.com","https://livquik.com","https://m2p.syntizen.app","https://uat-leadportal.m2pfintech.com","https://staging.m2pfintech.com","http://localhost:3000", "https://connect.m2pfintech.com", "https://events.m2pfintech.com"]
}
const constant = require("./constant.js");

const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error("Blocked by cors"))
    }
  }
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(cookieParser());
app.use(csrf({ cookie:{secure:true , httpOnly:true} }));
app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:["'self'"],
        scriptSrcAttr: ["'self'"],
        scriptSrc: ["'self'",'pro.fontawesome.com'],
        styleSrc: ["'self'",'pro.fontawesome.com',"'sha384-AYmEC3Yw5cVb3ZcuHtOA93w35dYTsvhLPVnYs9eStHfGJvOvKxVfELGroGkvsg+p'"],
        styleSrcElem: ["'self'",'pro.fontawesome.com',"'sha384-AYmEC3Yw5cVb3ZcuHtOA93w35dYTsvhLPVnYs9eStHfGJvOvKxVfELGroGkvsg+p'"],
        scriptSrcElem: ["'self'"],
        fontSrc: ["'self'",' pro.fontawesome.com'],
      },
  },
}));
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.xssFilter());
app.use(helmet.noSniff());

app.use(function (req, res, next) {

  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin",whitelist);
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin,Content-Type, x-requested-with")
  res.setHeader('pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Frame-Options', 'deny');
  res.setHeader("Permissions-Policy", "geolocation=(self), microphone=()");
  res.setHeader('Cache-Control', 'no-store, no-cache, pre-check=0, post-check=0, max-age=0, s-maxage=0');
  next();
});
//handleBars
app.use(express.static(path.join(__dirname + "/public")));

app.set("views", path.join(__dirname + "/views"));
app.engine(
  "handlebars",
  hbs.engine({
    defaultLayout: "main",
    partialsDir: __dirname + "/views/partials/",
  })
);
app.set("view engine", "handlebars");

app.use(function (req, res, next) {
    if (req.headers['x-forwarded-host']) {
        req.headers.referrerBaseUrl = req.headers['x-forwarded-host'];
    } else {
        req.headers.referrerBaseUrl = req.headers.host;
    }
    if (req.method === 'POST') {
        req.body = JSON.parse(JSON.stringify(req.body).replace(/[<>]/g, ""));
        next();
    } else {
        next();
    }
});

app.use(function (err, req, res, next) {

  if (whitelist.includes(req.headers.origin)) {
    res.status(200);
    next();
  } else {
    if (err.code !== "EBADCSRFTOKEN") {
      next(err);
    } else {
      res.status(403);
      log.info("Unauthorized request");
      res.send("Unauthorized request");
    }
    // handle CSRF token errors here
  }
});

const oneDay = 1000 * 60 * 60 * 24; // one day
app.set('trust proxy', 1)

app.use(
  session({
    secret: constant.SECRETKEY,
    saveUninitialized: false,
    proxy:true,
    resave: false,

    cookie: {
      maxAge: 31536000,
      path:"/",
      httpOnly: false,
      secure:true,
      sameSite:"none"
    },
    rolling: true,
  })
);


app.use(require("./router"));
app.use(cors(corsOptions));
require("./apiConfig")(app);

app.listen((`${port}`), () => {
  log.info(`Example app listening on port ${port}!`);
});

app.use(function (req, res, next) {
  res.status(404);
  res.render("template/404", { layout: false });
});

app.use(function (req, res, next) {
  res.status(403);
  res.render("template/403", { layout: false });
});

app.use(function (req, res, next) {
  res.status(401);
  res.render("template/401", { layout: false });
});
