const mongoose = require("mongoose");
const constant = require('../constant')
const bluebird = require("bluebird");
const log = require('./log')
mongoose.Promise = bluebird;

let env = process.env.ENV
if (env === "DEV") {
  mongoose.connect(constant.MONGOURL,
    {
      useNewUrlParser: true ,
      useUnifiedTopology: true

    }
    , (err, success) => {
      if (err) {
        log.error('DEV-Database connection unsuccessfull')
        log.error(err)
      }
      if (success) {
        log.warn("DEV-Database connection Successfull")
      }
    });
}
if (env === "UAT") {
  console.log(env);
  mongoose.connect(constant.MONGOURL, {
    replicaSet: "mongo-uat-cluster",
    useNewUrlParser: true,
    loggerLevel: 'info',
    authSource: "admin",
    useUnifiedTopology: true
  }, (err, success) => {
    if (err) {
      log.error('UAT-Database connection unsuccessfull')
      log.error(err)
    }
    if (success) {
      log.warn("UAT-Database connection Successfull")
    }
  });
}
if (env === "PROD") {
  mongoose.connect(constant.MONGOURL,
    { useNewUrlParser: true }
    , (err, success) => {
      if (err) {
        log.error('PROD-Database connection unsuccessfull')
        log.error(err)
      }
      if (success) {
        log.warn("PROD-Database connection Successfull")
      }
    });
}
const db = mongoose.connection;

const contactusSchma = mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    company: String,
    companyname: String,
    country: String,
    product: String,
    msg: String,
    url: String,
  },
  { timestamps: true }
);
exports.contactData = mongoose.model("contact", contactusSchma);

const footercontactusSchma = mongoose.Schema(
  {
    name: String,
    company: String,
    email: String,
    msg: String,
    url: String,
  },
  { timestamps: true }
);
exports.footerContactData = mongoose.model("footerContact", footercontactusSchma);

const subscription = mongoose.Schema(
  {
    email: String,
    pagename: String,
    url: String,
  },
  { timestamps: true }
);
exports.subscriptionData = mongoose.model("subscription", subscription);

const landingPage = mongoose.Schema(
  {
    name: String,
    email: String,
    country: String,
    company: String,
    pagename: String,
    url: String,
  },
  { timestamps: true }
);
exports.landingPageData = mongoose.model("landingpage", landingPage);

//betterhalf
const betterhalfotp = new mongoose.Schema(
  {
    mobileNo: String,
    otp: { type: String },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
exports.betterhalfotp = mongoose.model("betterhalfotp", betterhalfotp);

//Finflux
const finfluxSchema = mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    category: String,
    companyname: String,
    country: String,
    product: String,
    msg: String,
    url: String,
  },
  { timestamps: true }
);
exports.finfluxContactData = mongoose.model("finflux", finfluxSchema);

//Livquik
const livquikQuikwalletSchema = mongoose.Schema(
  {
    name: String,
    phone: String,
    companyName: String,
    url: String,
  },
  { timestamps: true }
);
exports.livquikQuikwallet = mongoose.model("livquik-Quikwallet", livquikQuikwalletSchema);

const livquikContact = mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    companyName: String,
    message: String,
    url: String,
  },
  { timestamps: true }
);
exports.livquikContact = mongoose.model("livquik-Contact", livquikContact);

const livquikCareer = mongoose.Schema(
  {
    firstname: String,
    lastname: String,
    email: String,
    phone: String,
    position: String,
    files: Object
  },
  { timestamps: true }
);
exports.livquikCareer = mongoose.model("livquik-Career", livquikCareer);

//Seamless event
const seamless = mongoose.Schema(
  {
    email: String,
    insight: String
  },
  { timestamps: true }
);
exports.seamlessContact = mongoose.model("seamless", seamless);

//OTP trigger - leadportal
const otpTrigger = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
exports.otpTrigger = mongoose.model("otp-trigger", otpTrigger);

//Password reset
const passwordReset = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    otp: { type: String, required: true },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
exports.passwordReset = mongoose.model("password-Reset", passwordReset);

//paylater

const paylaterSchema = mongoose.Schema(
  {
    name: String,
    mobileNum: String,
    company: String,
  },
  { timestamps: true }
);
exports.paylater = mongoose.model("paylater", paylaterSchema);

//white papers
const whitePapersSchema = mongoose.Schema(
  {
    name: String,
    email:String,
    mobileNum: String,
    company: String,
    category: String,
    url: String
  },
  { timestamps: true }
);
exports.whitePapers = mongoose.model("whitePapers", whitePapersSchema);

//mfi
const mfiSchema = mongoose.Schema(
  {
    name: String,
    company: String,
    email:String,
    mobileNum: String,
    url: String,
  },
  { timestamps: true }
);
exports.mfi = mongoose.model("mfi", mfiSchema);

//gff
const gffSchema = mongoose.Schema(
  {
    name: String,
    email:String,
    contact: String,
    insight: String,
  },
  { timestamps: true }
);
exports.gff = mongoose.model("gff", gffSchema);

//gff
const globalFintechSchema = mongoose.Schema(
  {
    name: String,
    email:String,
    companyName:String,
    contact: String,
    insight: String,
  },
  { timestamps: true }
);
exports.globalFintech = mongoose.model("globalFintech", globalFintechSchema);

const singaporeFintechSchema = mongoose.Schema(
  {
    name: String,
    email:String,
    companyName:String,
    contact: String,
    insight: String,
  },
  { timestamps: true }
);
exports.singaporeFintech = mongoose.model("singaporeFintech", singaporeFintechSchema);

//Join The Fun
const jtfchema = mongoose.Schema(
  {
    name: String,
    email:String,
    companyName: String,
    contact: String,
    insight: String,
  },
  { timestamps: true }
);
exports.jtfchema = mongoose.model("joinTheFun", jtfchema);
//aws marketplace
const awsMarketPlaceSchema = mongoose.Schema(
  {
    name: String,
    email:String,
    contact: String,
    companyName: String,
    designation: String,
    country: String,
    product: String,
    url: String,
  },
  { timestamps: true }
);
exports.awsMarketPlace = mongoose.model("awsMarketPlace", awsMarketPlaceSchema);