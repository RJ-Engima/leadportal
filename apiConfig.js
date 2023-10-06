const express = require("express");
const app = express();
const mongooseschema = require("./config/scemaModule");
const constant = require("./constant.js");
const { response } = require("express");
var logger = require("morgan");
var log = require("./config/log");
const request = require("request");
var jwt = require("jsonwebtoken");
const requestP = require("./config/middleware");
const Joi = require("joi");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const multer = require("multer");
const AWS = require("aws-sdk");
const path = require("path");
const moment = require("moment");
const fs = require("fs");
const { v4: uuidv4, v6: uuidv6 } = require("uuid");
const nodemailer = require("nodemailer");
const handleBars = require("handlebars");

module.exports = function (app) {
  const verifyAccess = (req, res, next) => {
    var pathIgnore = [
      "/submitContact",
      "/submitFooterContact",
      "/submitLandingpageForm",
      "/submitSubcription",
      "/submitBetterhalf",
      "/validateBetterOtp",
      "/finsubmit",
      "/livquik/quikwallet/contact-us",
      "/livquik/contact-us/submit",
      "/livquik/careers/submit",
      "/seamless/formSubmit",
      "/seamless/download",
      "/paylater/submit",
      "/m2p/whitepapers/submit",
      "/mfi/submit",
      "/gff/submit",
      "/sff/submit",
      "/gff/join-the-fun/submit",
      "/aws-marketplace/submit"
    ];
    var hostIgnore = [
      "https://staging.m2pfintech.com",
      "https://m2pfintech.com",
      "http://localhost:3000",
      "http://localhost:5500",
      "http://localhost:5502",
      "https://connect.m2pfintech.com",
      "https://events.m2pfintech.com",
      "https://livquik.com",
      "https://staging.livquik.com",
      "https://m2p.syntizen.app",
    ];
    if (
      pathIgnore.includes(req.path) &&
      hostIgnore.includes(req.headers.origin)
    ) {
      next();
    } else {
      const authHeader = req.headers.authorization.split(" ")[1];
      if (authHeader) {
        jwt.verify(authHeader, constant.ACCESSKEY, (err, user) => {
          if (err) {
            return res.status(403).json("Session Expired");
          }
          req.user = user;
          const newAccessToken = generateAccessToken({ user });
          next();
        });
      } else {
        return res.status(401).json("You are not authenticated!");
      }
    }
  };
  const tempStorage = multer.memoryStorage();
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, constant.UPLOAD_FILE_PATH);
    },
    filename: function (req, file, cb) {
      let userName = req.body.firstname + "_" + req.body.lastname;
      let fileName =
        userName +
        "_" +
        file.originalname.split(".")[0] +
        "_" +
        moment().format("YYYY-MM-DD HH:mm");
      let fileNameToReplace =
        fileName.replace(/\s+/g, "_").toLowerCase() +
        path.extname(file.originalname);
      cb(null, fileNameToReplace);
    },
  });
  let upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
      let fileType = [".jpg", ".jpeg", ".png", ".pdf", ".JPG", ".JPEG", ".PNG"];
      if (fileType.includes(path.extname(file.originalname))) {
        cb(null, true);
      } else {
        cb(new Error("File format not supported"));
      }
    },
    limits: { fileSize: constant.FILE_UPLOAD_SIZE },
  });
  const s3 = new AWS.S3({
    accessKeyId: constant.AWS_ACCESS_KEY_ID,
    secretAccessKey: constant.AWS_SECRET_ACCESS_KEY,
    Bucket: constant.AWS_BUCKET_NAME,
    region: constant.AWS_REGION,
  });
  // CSV config
  const csvWriter = createCsvWriter({
    path: "./data.csv",
    header: [
      { id: "email", title: "Email" },
      { id: "insight", title: "Insight" },
    ],
  });
  // Initialize Limiter
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 min window
    max: 1, // start blocking after 1 requests
    message: "Too many requests",
  });
  // Initialize Limiter
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 min window
    max: 3, // start blocking after 1 requests
    message: "Too many requests",
  });
  //Dynamic Mailing data
  let pingMailStatus = 0
  const readHTMLFile = (path, callback) => {
    fs.readFile(path, { encoding: "utf-8" }, function (err, html) {
      if (err) {
        console.log(err);
        callback(err);
      } else {
        callback(null, html);
      }
    });
  };

  const sendMail = (to, path, body, req, res) => {
    readHTMLFile(path, function (err, html) {
      if (err) {
        log.error("error reading file", JSON.stringify(err));
        res.status(500).send("Something went wrong");
        return;
      }
      let template = handleBars.compile(html);
      let htmlToSend = template(body);
      let jdata = {
        business: "M2PSITE",
        transactionType: "m2p_site_mail_notify",
        emailNotifyData: {
          to_email: to,
          title: "Hi",
          body: htmlToSend,
        },
      };
      request(
        {
          url: constant.EMAIL_NOTIFY_PRODUCTION,
          method: "POST",
          headers: {
            "content-Type": "application/json",
          },
          body: JSON.stringify(jdata),
        },
        function (error, response, body) {
          if (error) {
            log.info(error);
            return res.status(response.statusCode).end("something went wrong");
          } else {
            if (response.statusCode === 500) {
              log.error(error);
              return res.status(response.statusCode).end(error);
            } else if (response.statusCode === 200) {
              log.info("Email sent successfully to Ping");
              return pingMailStatus = response.statusCode
              // res.status(response.statusCode).end("Email sent successfully to Ping");
            } else {
              log.error("Something went wrong at Ping Mail");
              return res
                .status(response.statusCode)
                .end("Something went wrong at Ping Mail");
            }
          }
        }
      );
      // return res.status(200).end("Data success submitted");
    });
  };

  const sendThankYouMail = (path, body, req, res) => {
    console.log(pingMailStatus);
    readHTMLFile(path, function (err, html) {
      if (err) {
        log.error("error reading file", JSON.stringify(err));
        res.status(500).send("Something went wrong");
        return;
      }
      let template = handleBars.compile(html);
      let htmlToSend = template(body);
      let contactMail = {
        business: "M2PSITE",
        transactionType: "m2p_site_mail_thank",
        emailNotifyData: {
          to_email: req.body.email,
          title: "Dear"+" "+req.body.name,
          body: htmlToSend,
        },
      };
      request(
        {
          url: constant.EMAIL_NOTIFY_PRODUCTION,
          method: "POST",
          headers: {
            "content-Type": "application/json",
          },
          body: JSON.stringify(contactMail),
        },
        function (error, response, body) {
          if (error) {
            log.info(error);
            return res
              .status(response.statusCode)
              .end("Something went wrong in Contacted Person Mail");
          } else {
            if (response.statusCode === 500) {
              log.error(error);
              return res.status(response.statusCode).end(error);
            } else if (response.statusCode === 200) {
              log.info("Email sent successfully to Contacted Person");
              return res.status(response.statusCode).end("Email sent successfully to Contacted Person");
            } else {
              log.error("Something went wrong at Contacted Person Mail");
              return res
                .status(response.statusCode)
                .end("Something went wrong at Contacted Person Mail");
            }
          }
        }
      );
      return res.status(200).end("Data success submitted");
    });
  };

  //betterhalf
  app.post(
    "/submitBetterhalf",
    apiLimiter,
    verifyAccess,
    async function (req, res) {
      log.info("BetterHalf OTP Generation API hit reached");
      const schema = Joi.object({
        mobileNo: Joi.number().required().messages({
          "string.base": `"Mobile num:Invalid data."`,
          "string.number": `Enter valid mobile number`,
          "any.required": `"" is a required field`,
        }),
      });
      try {
        log.info("Payload validation check");
        const result = await schema.validateAsync(req.body);
        console.log(result);
        log.info("Payload validation successfull");
      } catch (err) {
        log.info("Payload validation Error");
        console.log(err);
        // log.error(JSON.parse({"original":err._original}));
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      }
      if (response.statusCode === 200) {
        let mobileNo = "+91" + req.body.mobileNo;
        function generateOTP() {
          var digits = "0123456789";
          var otpLength = 6;
          var otp = "";
          for (let i = 1; i <= otpLength; i++) {
            var index = Math.floor(Math.random() * (999999 - 100000) + 100000);
            otp = index;
          }
          return otp;
        }
        let otpNotify = {};
        (otpNotify.business = "M2P"),
          (otpNotify.args = [generateOTP()]),
          (otpNotify.mobileNo = mobileNo);
        otpNotify.transactionType = "otp";
        let sendOtpNotify = requestP.postRequest(
          constant.NOTIFICATION_URL,
          "M2P",
          otpNotify
        );
        sendOtpNotify.then((response) => {
          let responseNotifyObj;
          if (response.statusCode === 200) {
            responseNotifyObj = response.body.code;
            const user = responseNotifyObj;
            log.info(
              "Notification Status:" + JSON.stringify(responseNotifyObj)
            );
            const otpInfo = mongooseschema.betterhalfotp({
              mobileNo: otpNotify.mobileNo,
              otp: otpNotify.args[0],
              // status:false
            });
            res.status(response.statusCode).send({ status: "SUCCESS" });
            otpInfo.save(function (err, success) {
              if (err) {
                log.info(err);
              }
              if (success) {
                log.info("OTP data saved successfully");
              }
            });
          } else if (response.statusCode === 500) {
            responseNotifyObj = response.body.exception.detailMessage;
            res.status(500).send(responseNotifyObj);
          } else {
            res.status(500).send(constant.INTERNAL_SERVER_ERROR);
          }
        });
      } else {
        return res.status(response.statusCode).end("something went wrong");
      }
    }
  );
  app.post("/validateBetterOtp", verifyAccess, async function (req, res) {
    log.info("Validating OTP ...");
    const schema = Joi.object({
      mobileNo: Joi.number().required().messages({
        "string.base": `"Mobile num:Invalid data."`,
        "string.number": `Enter valid mobile number`,
        "any.required": `"" is a required field`,
      }),
      otp: Joi.number().required().messages({
        "string.base": `"Mobile num:Invalid data."`,
        "string.number": `Enter valid mobile number`,
        "any.required": `"" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      const result = await schema.validateAsync(req.body);
      console.log(result);
      log.info("Payload validation successfull");
    } catch (err) {
      log.info("Payload validation Error");
      console.log(err);
      // log.error(JSON.parse({"original":err._original}));
      return res.status(400).send({
        Error: {
          title: "Bad request",
          message: err.details[0].message,
        },
      });
    }
    const checkOtp = {
      mobileNo: "+91" + req.body.mobileNo,
      otp: req.body.otp,
    };
    if (response.statusCode === 200) {
      try {
        if (req.body.mobileNo === "" || req.body.otp === "") {
          log.info("Bad Request-BetterHalf validation failed");
          res.status(400).send("Bad Request");
        } else {
          mongooseschema.betterhalfotp
            .find({
              mobileNo: checkOtp.mobileNo,
              otp: checkOtp.otp,
            })
            .select("mobileNo otp status")
            .exec(function (err, result) {
              let resultChk = result[0];
              if (err) {
                log.info(err);
              }
              if (resultChk === undefined) {
                log.info(
                  "mobileNo:" +
                    "+91" +
                    req.body.mobileNo +
                    " OTP:" +
                    req.body.otp +
                    ";Result:" +
                    "Invalid OTP"
                );
                res.status(401).send("Invalid OTP");
              } else if (
                resultChk.otp === checkOtp.otp &&
                resultChk.status === true
              ) {
                log.info(
                  "mobileNo:" +
                    "+91" +
                    req.body.mobileNo +
                    " OTP:" +
                    req.body.otp +
                    ";Result:" +
                    "OTP already verified or expired"
                );
                res.status(409).send("OTP already verified or expired");
              } else if (
                checkOtp.mobileNo === resultChk.mobileNo &&
                checkOtp.otp === resultChk.otp &&
                resultChk.status === false
              ) {
                mongooseschema.betterhalfotp
                  .updateOne({ otp: resultChk.otp }, { $set: { status: true } })
                  .exec(function (err, result) {
                    if (err) {
                      log.info(err);
                      res
                        .status(500)
                        .json("Something went wrong. Try again later");
                    }
                    if (result) {
                      log.info(
                        "mobileNo:" +
                          "+91" +
                          req.body.mobileNo +
                          " OTP:" +
                          req.body.otp +
                          ";Result:" +
                          "OTP verified successfully"
                      );
                      log.info("OTP verified successfully");
                      res
                        .status(response.statusCode)
                        .send({ status: "SUCCESS" });
                    }
                  });
              }
            });
        }
      } catch (err) {
        log.error(err);
        res.status(500).send(constant.ERROR_MSG);
      }
    } else {
      res.status(500).send(constant.ERROR_MSG);
    }
  });

  app.post("/submitContact", apiLimiter, verifyAccess, async (req, res) => {
    log.info("Submit API hit reached");
    let txtPat = /^[\w\-\s]+$/;
    let compRegex = new RegExp("^[ A-Za-z0-9_?]*$");
    let regexFreeTxt = new RegExp("^[ A-Za-z0-9_?.,)(-]*$")
    const schema = Joi.object({
      name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"Name" is a required field`,
      }),
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"Email" is a required field`,
      }),
      phone: Joi.string()
        .regex(/^[0-9()+]/)
        .required()
        .messages({
          "string.base": `"Phone:Invalid data."`,
          "string.pattern.base": `Enter valid mobile number`,
          "any.required": `"Mobile number" is a required field`,
        }),
      company: Joi.string().alphanum().required().messages({
        "string.base": `"Company:Invalid data."`,
        "string.alphanum": `Select valid entity`,
        "any.required": `"Company name" is a required field`,
      }),
      companyname: Joi.string().regex(compRegex).messages({
        "string.base": `"Company name:Invalid data."`,
        "string.pattern.base": `Enter valid company name`,
        "any.required": `"" is a required field`,
        "string.pattern.base": "Enter valid company name",
      }),
      country: Joi.string()
        .regex(/^[-\w/\\/()+,\s+]+$/)
        .required()
        .messages({
          "string.base": `"Country:Invalid data."`,
          "string.pattern.base": `Select proper country`,
          "any.required": `"Country" is a required field`,
        }),
      product: Joi.string()
        .regex(/^[-\w/\\/()+,\s+]+$/)
        .messages({
          "string.base": `"Product:Invalid data."`,
          "string.pattern.base": `Select listed products`,
          "any.required": `"Product" is a required field`,
        }),
      msg: Joi.string().regex(regexFreeTxt).allow("").messages({
        "string.base": `"Message:Invalid data."`,
        "string.pattern.base": `Enter valid message`,
        "any.required": `"Message" is a required field`,
      }),
      url: Joi.string().uri().messages({
        "string.base": `"URL:Invalid data."`,
        "string.uri": `Enter valid url`,
        "any.required": `"url" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      mongooseschema.contactData
        .find({ email: req.body.email })
        .exec((err, result) => {
          if (err) {
            log.error(err);
            return res.status(500).json("Something went wrong");
          }
          if (result) {
            let date = [];
            const currentDate = new Date().toLocaleDateString();
            result.map((item) => {
              date.push(item.createdAt.toLocaleDateString());
            });
            const elementCounts = {};
            date.forEach((element) => {
              elementCounts[element] = (elementCounts[element] || 0) + 1;
            });
            if (elementCounts[currentDate] === 3) {
              log.error("Contact user reached limit");
              return res.status(429).json("You have reached the day limit");
            } else {
              const contact = mongooseschema.contactData({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                company: req.body.company,
                companyname: req.body.companyname,
                country: req.body.country,
                product: req.body.product,
                msg: req.body.msg,
                url: req.body.url,
              });
              try {
                contact.save();
                log.info("data inserted to DB");
                if (req.body.companyname === "") {
                  var style = `style="display:none;"`;
                }
                sendMail("mailTemplate/m2p-contactUs.html", req.body, req, res);
                sendThankYouMail ("mailTemplate/m2p-thankYou.html", req.body, req, res)

              } catch (err) {
                log.error(err);
                return res.status(500).end("something went wrong");
              }
            }
          }
        });
    } catch (err) {
      log.error("Payload validation Error");
      console.log(err);
      return res.status(400).send({
        Error: {
          title: "Bad request",
          message: err.details[0].message,
        },
      });
    }
  });
  app.post("/submitFooterContact",apiLimiter,verifyAccess,async (req, res) => {
    log.info("Footer Contact Submit API hit reached");
    let txtPat = /^[\w\-\s]+$/;
    let compRegex = new RegExp("^[ A-Za-z0-9_?]*$");
    let regexFreeTxt = new RegExp("^[ A-Za-z0-9_?.,)(-]*$")
    const schema = Joi.object({
      name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"Name" is a required field`,
      }),
      company: Joi.string().regex(compRegex).required().messages({
        "string.base": `"Company name:Invalid data."`,
        "string.pattern.base": `Enter valid company name`,
        "any.required": `"Company name" is a required field`,
      }),
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"" is a required field`,
      }),
      msg: Joi.string().regex(regexFreeTxt).allow("").messages({
        "string.base": `"Message:Invalid data."`,
        "string.pattern.base": `Enter valid message`,
        "any.required": `"Message" is a required field`,
      }),
      url: Joi.string().uri().messages({
        "string.base": `"URL:Invalid data."`,
        "string.uri": `Enter valid url`,
        "any.required": `"Url" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      var style;
      mongooseschema.footerContactData
        .find({ email: req.body.email })
        .exec((err, result) => {
          if (err) {
            log.error(err);
            return res.status(500).json("Something went wrong");
          }
          if (result) {
            if (result.length === 3) {
              log.error("Contact user reached limit");
              return res.status(429).json("Limit has been reached");
            } else {
              const footerContact = mongooseschema.footerContactData({
                name: req.body.name,
                company: req.body.company,
                email: req.body.email,
                msg: req.body.msg,
                url: req.body.url,
              });
              try {
                if (response.statusCode === 200) {
                  if (req.body.companyname === "") {
                    style = `style="display:none;"`;
                  }

                  var jdata = {
                    business: "M2PSITE",
                    transactionType: "m2p_site_mail_notify",
                    emailNotifyData: {
                      to_email: "rajeshk@m2pfintech.com",
                      title: "Hi",
                      body: `<div style="margin:auto; height: 100vh;">
                        <div style=" width: 580px; margin: auto; background-color:#FFFFFF; padding-top: 30px;">
                            <div style="text-align: center;"> <img src="https://m2p-website-static-files.s3.ap-south-1.amazonaws.com/images/m2p-logo.png" alt="" style="width: 72px; height: 77px;" >
                            </div>
                            <p style="text-align: center; font-size: 18px; line-height: 22px;">Contact Form Submission</p>
                            <table class="table" style=" padding: 20px; font-size: 14px; line-height: 17px; margin: auto;" >

                                <tr>
                                    <td style="padding: 15px 60px 15px 70px; border-bottom: #F3F3F3 1px solid; text-align: left; width: 43%;">Name</td>
                                    <td style="padding: 15px 10px 15px 30px; border-bottom: #F3F3F3 1px solid; ">${req.body.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Company</td>
                                    <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.company}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Email</td>
                                    <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid;">${req.body.email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 60px 15px 70px; vertical-align:initial; text-align: left; ">Message</td>
                                    <td style="padding: 15px 10px 15px 30px; line-height: 1.5; "> ${req.body.msg}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 60px 15px 70px; vertical-align:initial; text-align: left; ">URL</td>
                                    <td style="padding: 15px 10px 15px 30px; line-height: 1.5; "> ${req.body.url}</td>
                                </tr>
                            </table>
                        </div>
                    </div>`,
                    },
                  };
                  request(
                    {
                      url: constant.EMAIL_NOTIFY_PRODUCTION,
                      method: "POST",
                      headers: {
                        "content-Type": "application/json",
                      },
                      body: JSON.stringify(jdata),
                    },
                    function (error, response, body) {
                      if (error) {
                        log.info(error);
                        return res
                          .status(response.statusCode)
                          .end("something went wrong");
                      } else {
                        if (response.statusCode === 500) {
                          log.error(error);
                          return res.status(response.statusCode).end(error);
                        } else if (response.statusCode === 200) {
                          let contactMail = {
                            business: "M2PSITE",
                            transactionType: "m2p_site_mail_notify",
                            emailNotifyData: {
                              to_email: req.body.email,
                              title: "Hi",
                              body: `Thank you for contacting us. We have received your message.
                          A team member will reach out to you ASAP. Have a great day.`,
                            },
                          };
                          request(
                            {
                              url: constant.EMAIL_NOTIFY_PRODUCTION,
                              method: "POST",
                              headers: {
                                "content-Type": "application/json",
                              },
                              body: JSON.stringify(contactMail),
                            },
                            function (error, response, body) {
                              if (error) {
                                log.info(error);
                                return res
                                  .status(response.statusCode)
                                  .end(
                                    "Something went wrong in Contacted Person Mail"
                                  );
                              } else {
                                if (response.statusCode === 500) {
                                  log.error(error);
                                  return res
                                    .status(response.statusCode)
                                    .end(error);
                                } else if (response.statusCode === 200) {
                                  log.info(
                                    "Email sent successfully to Contacted Person"
                                  );
                                  return res
                                    .status(response.statusCode)
                                    .end(
                                      "Email sent successfully to Contacted Person"
                                    );
                                } else {
                                  log.error(
                                    "Something went wrong at Contacted Person Mail"
                                  );
                                  return res
                                    .status(response.statusCode)
                                    .end(
                                      "Something went wrong at Contacted Person Mail"
                                    );
                                }
                              }
                            }
                          );
                          log.info("Email sent successfully to Ping");
                          return res
                            .status(response.statusCode)
                            .end("Email sent successfully to Ping");
                        } else {
                          log.error("Something went wrong at Ping Mail");
                          return res
                            .status(response.statusCode)
                            .end("Something went wrong at Ping Mail");
                        }
                      }
                    }
                  );
                  footerContact.save();
                  log.info("data inserted to DB");
                  return res.status(200).end("data success submitted");
                } else {
                  return res
                    .status(response.statusCode)
                    .end("something went wrong");
                }
              } catch (err) {
                log.error(err);
                return res.status(500).end("something went wrong");
              }
            }
          }
        });
    } catch (err) {
      log.info("Payload validation Error");
      return res.status(400).send({
        Error: {
          title: "Bad request",
          message: err.details[0].message,
        },
      });
    }
  });

  // app.post("/submitLandingpageForm", verifyAccess, async (req, res) => {
  //   log.info("submitLandingpageForm API hit reached");
  //   const contact = mongooseschema.landingPageData({
  //     name: req.body.name,
  //     email: req.body.email,
  //     country: req.body.country,
  //     company: req.body.company,
  //     pagename: req.body.pagename,
  //     url: req.body.url,
  //   });
  //   try {
  //     if (response.statusCode === 200) {
  //       var jdata = {
  //         business: "M2PSITE",
  //         transactionType: "m2p_site_mail_notify",
  //         emailNotifyData: {
  //           to_email: "allleads@m2pfintech.com",
  //           title: "Hi",
  //           body: `<div style="margin:auto; height: 100vh;">
  //                   <div style=" width: 580px; margin: auto; background-color:#FFFFFF; padding-top: 30px;">

  //                       <div style="text-align: center;"> <img src="https://m2p-website-static-files.s3.ap-south-1.amazonaws.com/images/m2p-logo.png" alt="" style="width: 72px; height: 77px;" >
  //                       </div>
  //                       <p style="text-align: center; font-size: 18px; line-height: 22px;">${req.body.pagename} Submission</p>
  //                       <table class="table" style=" padding: 20px; font-size: 14px; line-height: 17px; margin: auto;" >
  //                           <tr>
  //                               <td style="padding: 15px 70px; border-bottom: #F3F3F3 1px solid; text-align: left; width: 43%;">Name</td>
  //                               <td style="padding: 15px; border-bottom: #F3F3F3 1px solid; ">${req.body.name}</td>
  //                           </tr>
  //                           <tr>
  //                               <td style="padding: 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Email</td>
  //                               <td style="padding: 15px;border-bottom: #F3F3F3 1px solid;">${req.body.email}</td>
  //                           </tr>
  //                           <tr>
  //                               <td style="padding: 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Mobile</td>
  //                               <td style="padding: 15px;border-bottom: #F3F3F3 1px solid">${req.body.country}</td>
  //                           </tr>
  //                           <tr>
  //                               <td style="padding: 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Company</td>
  //                               <td style="padding: 15px;border-bottom: #F3F3F3 1px solid">${req.body.company}</td>
  //                           </tr>
  //                           <tr>
  //                               <td style="padding: 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">URL</td>
  //                               <td style="padding: 15px;border-bottom: #F3F3F3 1px solid">${req.body.url}</td>
  //                           </tr>
  //                       </table>
  //                   </div>
  //               </div>`,
  //         },
  //       };
  //       request(
  //         {
  //           url: constant.EMAIL_NOTIFY_PRODUCTION,
  //           method: "POST",
  //           headers: {
  //             "content-Type": "application/json",
  //           },
  //           body: JSON.stringify(jdata),
  //         },
  //         function (error, response, body) {
  //           if (error) {
  //             log.info(error);
  //             return res
  //               .status(response.statusCode)
  //               .end("something went wrong");
  //           } else {
  //             if (response.statusCode === 500) {
  //               log.error(error);
  //               return res.status(response.statusCode).end(error);
  //             } else if (response.statusCode === 200) {
  //               log.info("Landing page Email sent successfully");
  //               return res
  //                 .status(response.statusCode)
  //                 .end("Email sent successfully");
  //             } else {
  //               log.error("something went wrong");
  //               return res
  //                 .status(response.statusCode)
  //                 .end("something went wrong");
  //             }
  //           }
  //         }
  //       );

  //       const dt = await contact.save();
  //       log.info("data inserted to DB");
  //       return res.status(200).end("data success submitted");
  //     } else {
  //       return res.status(response.statusCode).end("something went wrong");
  //     }
  //   } catch (err) {
  //     log.error(err);
  //     return res.status(500).end("something went wrong");
  //   }
  // });

  app.post("/submitSubcription", apiLimiter, verifyAccess, async (req, res) => {
    log.info("submitLandingpageForm API hit reached");
    console.log(req.body);
    let txtPat = /^[\w\-\s]+$/;
    const schema = Joi.object({
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"Email" is a required field`,
      }),
      pagename: Joi.string().regex(txtPat).max(30).messages({
        "string.base": `"Message:Invalid data."`,
        "string.pattern.base": `Enter valid pagename`,
        "any.required": `"Page name" is a required field`,
      }),
      url: Joi.string().uri().messages({
        "string.base": `"URL:Invalid data."`,
        "string.uri": `Enter valid url`,
        "any.required": `"Url" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      const result = await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      const contact = mongooseschema.subscriptionData({
        email: req.body.email,
        pagename: req.body.pagename,
        url: req.body.url,
      });
      try {
        await contact.save();
        log.info("Subcription Data inserted to DB");
        return res.status(200).end("Subcription Data submitted successfully ");
      } catch (err) {
        log.error(err);
        return res.status(500).end("something went wrong");
      }
    } catch (err) {
      log.info("Payload validation Error");
      log.error(err);
      return res.status(400).send({
        Error: {
          title: "Bad request",
          message: err.details[0].message,
        },
      });
    }
  });

  app.post("/getContactData", async (req, res) => {
    log.info("Get Contact hit Received");
    const contactResult = mongooseschema.contactData;
    try {
      const result = await contactResult.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from Contact");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Get Contact Something went wrong");
    }
  });

  app.post("/getFooterContactData", verifyAccess, async (req, res) => {
    log.info("Get Footer-Contact data hit Received");
    const contactResult = mongooseschema.footerContactData;
    try {
      const result = await contactResult.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from Contact");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Get Contact Something went wrong");
    }
  });
  app.post("/getSubscriptionData", verifyAccess, async (req, res) => {
    log.info("Get Contact hit Received");
    const subscriptionResult = mongooseschema.subscriptionData;
    try {
      const result = await subscriptionResult.find().sort({ createdAt: -1 });

      log.info("Data Getting Success from Subscription");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Get Subscription Something went wrong");
    }
  });

  app.post("/getLandingPageData", verifyAccess, async (req, res) => {
    log.info("Get getLandingPageData hit Received");
    const landingPageResult = mongooseschema.landingPageData;
    try {
      const result = await landingPageResult.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from Subscription");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Get Landingpage data Something went wrong");
    }
  });

  app.post("/filterbyDateandCountry", verifyAccess, async (req, res) => {
    log.info("Get filterbyDateandCountry hit Received");
    const contactResult = mongooseschema.contactData;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const country = req.body.country;
    try {
      if (country != "") {
        const result = await contactResult
          .find({
            createdAt: {
              $gte: new Date(startDate).setHours(00, 00, 00),
              $lt: new Date(endDate).setHours(23, 59, 59),
            },
            country: country,
          })
          .sort({ createdAt: -1 });
        log.info("Data filter Success from Contact");
        return res.status(200).json(result);
      } else {
        const result = await contactResult
          .find({
            createdAt: {
              $gte: new Date(startDate).setHours(00, 00, 00),
              $lt: new Date(endDate).setHours(23, 59, 59),
            },
          })
          .sort({ createdAt: -1 });
        log.info("Data filter Success from Contact");
        return res.status(200).json(result);
      }
    } catch (err) {
      log.error(err);
      return res.status(500).end("Something went wrong in Contact filter");
    }
  });
  app.post("/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for footerContact hit Received");
    const contactResult = mongooseschema.footerContactData;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await contactResult
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from FooterContact");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Something went wrong in Contact filter");
    }
  });

  app.post("/subcriptionFilterbyPage", verifyAccess, async (req, res) => {
    log.info("Get subcriptionFilterbyPage hit Received");
    const subscriptionFilterResult = mongooseschema.subscriptionData;
    const pagename = req.body.pagename;
    try {
      if (pagename != "") {
        const result = await subscriptionFilterResult
          .find({ pagename: pagename })
          .sort({ createdAt: -1 });

        log.info("Data filter Success from Contact");
        return res.status(200).json(result);
      } else {
        const result = await subscriptionFilterResult
          .find()
          .sort({ createdAt: -1 });
        return res.status(200).json(result);
      }
    } catch (err) {
      log.error(err);
      return res.status(500).end("Something went wrong in Subscription Filter");
    }
  });

  app.post("/landingpageFilterbyPage", verifyAccess, async (req, res) => {
    log.info("Get landingpageFilterbyPage hit Received");
    const landingPageResult = mongooseschema.landingPageData;
    const pagename = req.body.pagename;
    try {
      if (pagename != "") {
        const result = await landingPageResult
          .find({ pagename: pagename })
          .sort({ createdAt: -1 });
        log.info("Data filter Success from Contact");
        return res.status(200).json(result);
      } else {
        const result = await landingPageResult.find().sort({ createdAt: -1 });

        log.info("Data filter Success from Contact");
        return res.status(200).json(result);
      }
    } catch (err) {
      log.error(err);
      return res.status(500).end("Something went wrong in Subscription Filter");
    }
  });

  function generateAccessToken(user) {
    return jwt.sign(user, constant.ACCESSKEY, { expiresIn: "30m" });
  }

  app.post("/login", async (req, res) => {
    log.info("login hit received");

    request(
      {
        url: constant.USER_LOGIN,
        method: "POST",
        headers: {
          APPLICATION: constant.APPLICATION,
          "Content-Type": "application/json",
          Authorization: constant.AUTH_BASIC_TOKEN,
        },
        body: JSON.stringify({
          userName: req.body.username,
          password: req.body.password,
          authType: "STATIC",
        }),
      },

      function (error, response, body) {
        if (error) {
          log.error("Error : " + error);
        } else {
          if (response.statusCode === 500) {
            let errorInfo = JSON.parse(body);
            log.error("errorInfo", errorInfo);
            return res
              .status(response.statusCode)
              .send(errorInfo.exception.shortMessage);
          } else if (response.statusCode === 200) {
            var resInfo = JSON.parse(body);
            var forMenu = JSON.stringify(
              resInfo.result.applicationDetails[0].menuDatas
            );
            var user = JSON.stringify(resInfo.result.loginDetail);
            userRole = resInfo.result;
            const jwttoken = generateAccessToken(userRole.loginDetail);
            const role = userRole.applicationDetails[0].data.role.name;
            req.session.authtoken = jwttoken;
            req.session.role = role;

            return res.status(response.statusCode).send({ userRole, jwttoken });
          } else {
            log.error("somethnig Error in login");
            return res
              .status(response.statusCode)
              .send("Something Went Wrong in login");
          }
        }
      }
    );
  });

  app.post("/forgotpassword", limiter, async function (req, res) {
    log.info("forgotpassword hit received");
    const data = JSON.stringify({
      userName: req.body.userName,
    });
    const otpTrigger = mongooseschema.otpTrigger({
      userName: req.body.userName,
    });
    mongooseschema.otpTrigger
      .find({ userName: req.body.userName, status: false })
      .exec((err, result) => {
        if (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
        if (result) {
          if (result.length === 1) {
            log.info(
              JSON.stringify({
                "OTP TRIGGERED USER": {
                  username: result[0].userName,
                  status: result[0].status,
                },
              })
            );
            res.status(429).send("OTP already sent");
          } else {
            otpTrigger.save((err, result) => {
              if (err) {
                console.log(err);
                log.error(err);
                res.status(500).send("OTP Trigger failed");
              }
              if (result) {
                // console.log(result);
                axios(
                  constant.FORGET_PASSWORD + `?userName=${req.body.userName}`,
                  {
                    APPLICATION: constant.APPLICATION,
                    method: "get",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    data: data,
                  }
                )
                  .then(function (response) {
                    console.log(response.data), "check result";
                    mongooseschema.otpTrigger
                      .deleteOne({ userName: req.body.userName, status: false })
                      .exec(function (error, result) {
                        if (error) {
                          console.log(error);
                          log.error(
                            "Something went wrong in deleting otp triggered user from database"
                          );
                          res.status(500).send("Something went wrong");
                        }
                        if (result) {
                          log.info(
                            JSON.stringify(
                              "OTP triggered successfully. User deleted from database success"
                            )
                          );
                          res
                            .status(response.status)
                            .send(response.data.result);
                        }
                      });
                  })
                  .catch(function (error) {
                    console.log(error.response.data, "check error");
                    res
                      .status(error.response.status)
                      .send(error.response.data.exception.shortMessage);
                  });
              }
            });
          }
        }
      });
  });

  app.post("/validateotp", async function (req, res) {
    log.info("validateotp hit received");
    const data = JSON.stringify({
      otp: req.body.otp,
      userName: req.body.userName,
    });
    let txtPat = /^[\w\-\s]+$/;
    const schema = Joi.object({
      userName: Joi.alternatives()
        .try(Joi.string().email(), Joi.string().regex(txtPat))
        .required()
        .messages({
          "string.base": `"Mobile num:Invalid data."`,
          "string.number": `Enter valid username`,
          "any.required": `"Username" is a required field`,
          "string.pattern.base": "Enter valid username",
        }),
      otp: Joi.number().required().messages({
        "string.base": `"OTP:Invalid data."`,
        "string.number": `Enter valid otp`,
        "any.required": `"OTP" is a required field`,
      }),
    });
    try {
      const result = await schema.validateAsync(req.body);
      console.log(result);
      const passwordFlag = mongooseschema.passwordReset({
        userName: req.body.userName,
        otp: req.body.otp,
      });
      passwordFlag.save((err, result) => {
        if (err) {
          console.log(err);
          log.error(err, "Mongo error in saving password flag");
          res.status(500).send("OTP validations failed");
        }
        if (result) {
          log.info("Password flag set successfull" + JSON.stringify(result));
          axios(constant.VALIDATE_OTP, {
            method: "post",
            headers: {
              "Content-Type": "application/json",
            },
            data: data,
          })
            .then(function (response) {
              console.log(response.data), "check result";
              mongooseschema.passwordReset
                .updateOne(
                  { userName: req.body.userName, otp: req.body.otp },
                  { $set: { status: true } }
                )
                .exec(function (error, result) {
                  if (error) {
                    console.log(error);
                    log.error(
                      "Something went wrong in updating otp validated user from database"
                    );
                  }
                  if (result) {
                    log.info(
                      JSON.stringify({
                        "OTP VALIDATED USER": {
                          username: req.body.userName,
                          otp: req.body.otp,
                          status: true,
                        },
                      })
                    );
                    res.status(response.status).send(response.data.result);
                  }
                });
            })
            .catch(function (error) {
              log.error(JSON.stringify(error.response.data));
              res
                .status(error.response.status)
                .send(error.response.data.exception.shortMessage);
            });
        }
      });
    } catch (error) {
      log.error(JSON.stringify(error));
      res.status(400).send(error.details[0].message);
    }
  });

  app.post("/resetPassword", function (req, res) {
    log.info("password reset hit received");
    // usename - true
    mongooseschema.passwordReset
      .find({ userName: req.body.userName })
      .sort({ createdAt: -1 })
      .limit(1)
      .exec(function (err, result) {
        if (err) {
          console.log(err);
          log.error("Error in finding the password reset user from database");
          res.status(500).send("SOmething went wrong");
        }
        if (result) {
          log.info(result[0]);
          if (result[0].status === true) {
            request(
              {
                url: constant.RESET_PASSWORD,
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userName: req.body.userName,
                  newPassword: req.body.password,
                  changer: req.body.userName,
                }),
              },
              function (error, response, body) {
                if (error) {
                  log.error("Error : " + error);
                } else {
                  if (response.statusCode === 500) {
                    let errorInfo = JSON.parse(body);
                    log.error(
                      "Error : StatusCode : " +
                        response.statusCode +
                        " ResponseException : " +
                        errorInfo
                    );
                    return res
                      .status(response.statusCode)
                      .send(errorInfo.exception.shortMessage);
                  } else if (response.statusCode === 200) {
                    var resInfo = JSON.parse(body);
                    log.info("Password reset successfully");
                    return res.status(response.statusCode).send(resInfo.result);
                  } else {
                    log.error("somethnig Error");
                    return res
                      .status(response.statusCode)
                      .send("Something Went Wrong");
                  }
                }
              }
            );
          } else {
            res.status(500).send("Unauthorized process");
          }
        }
      });
  });

  app.post("/changePassword", verifyAccess, function (req, res) {
    log.info("change password hit reached");
    request(
      {
        url: constant.CHANGE_PASSWORD,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: req.body.userName,
          oldPassword: req.bodycurrentpassword,
          newPassword: req.body.newPassword,
          changer: req.body.userName,
        }),
      },
      function (error, response, body) {
        if (error) {
          log.error("Error : " + error);
        } else {
          if (response.statusCode === 500) {
            let errorInfo = JSON.parse(body);
            log.error(
              "Error : StatusCode : " +
                response.statusCode +
                " ResponseException : " +
                errorInfo
            );
            return res
              .status(response.statusCode)
              .send(errorInfo.exception.shortMessage);
          } else if (response.statusCode === 200) {
            var resInfo = JSON.parse(body);
            log.info("Password reset successfully");
            return res.status(response.statusCode).send(resInfo.result);
          } else {
            log.error("somethnig Error");
            return res.status(response.statusCode).send("Something Went Wrong");
          }
        }
      }
    );
  });

  //livquik quikwallet contact us

  app.post(
    "/livquik/quikwallet/contact-us",
    apiLimiter,
    verifyAccess,
    async (req, res) => {
      log.info("Livquik contact API hit reached");
      let mobPat = /^[+]{1}(?:[0-9\-\(\)\/\.]\s?){6, 15}[0-9]{1}$/;
      let txtPat = /^[\w\-\s]+$/;
      const schema = Joi.object({
        name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
          "string.base": `"Name:Invalid data."`,
          "string.pattern.base": `Enter valid name`,
          "any.required": `"" is a required field`,
        }),
        phone: Joi.number().required().messages({
          "string.base": `"Invalid format. Enter valid mobile number."`,
          "string.pattern.base": `Enter valid mobile number.`,
          "any.required": `"Mobile number" is a required field`,
        }),
        companyName: Joi.string().regex(txtPat).messages({
          "string.base": `"Company Name:Invalid data."`,
          "string.pattern.base": `Enter valid company name`,
          "any.required": `"" is a required field`,
        }),
        url: Joi.string().uri().messages({
          "string.base": `"Invalid data."`,
          "string.uri": `"Enter valid url."`,
          "any.required": `"Url" is a required field`,
        }),
      });
      try {
        log.info("Payload validation check");
        const result = await schema.validateAsync(req.body);
        console.log(result);
        log.info("Payload validation successfull");
        const contact = mongooseschema.livquikQuikwallet({
          name: req.body.name,
          phone: req.body.phone,
          companyName: req.body.companyName,
          url: req.body.url,
        });
        try {
          var jdata = {
            business: "M2PSITE",
            transactionType: "m2p_site_mail_notify",
            emailNotifyData: {
              to_email:
                "bhargav.padh@m2pfintech.com,aditya@m2p.in,chinar@m2pfintech.com,paari@m2pfintech.com,rishabh@m2pfintech.com,saurabh.shelkar@m2pfintech.com",
              title: "Hi",
              body: `<div style="margin:auto; height: 100vh;">
                    <div style=" width: 580px; margin: auto; background-color:#FFFFFF; padding-top: 30px;">
                        <div style="text-align: center;"> <img src="https://livquik.com/wp-content/uploads/2020/01/cropped-Q-1.png" alt="" style="width: 72px; height: 77px;" >
                        </div>
                        <p style="text-align: center; font-size: 18px; line-height: 22px;">Contact Form Submission</p>
                        <table class="table" style=" padding: 20px; font-size: 14px; line-height: 17px; margin: auto;" >

                            <tr>
                                <td style="padding: 15px 60px 15px 70px; border-bottom: #F3F3F3 1px solid; text-align: left; width: 43%;">Name</td>
                                <td style="padding: 15px 10px 15px 30px; border-bottom: #F3F3F3 1px solid; ">${req.body.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Mobile</td>
                                <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.phone}</td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Company</td>
                                <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.companyName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 60px 15px 70px; vertical-align:initial; text-align: left; ">URL</td>
                                <td style="padding: 15px 10px 15px 30px; line-height: 1.5; "> ${req.body.url}</td>
                            </tr>
                        </table>
                    </div>
                </div>`,
            },
          };
          request(
            {
              url: constant.EMAIL_NOTIFY_PRODUCTION,
              method: "POST",
              headers: {
                "content-Type": "application/json",
              },
              body: JSON.stringify(jdata),
            },
            function (error, response, body) {
              if (error) {
                log.info(error);
                return res
                  .status(response.statusCode)
                  .end("something went wrong");
              } else {
                if (response.statusCode === 500) {
                  log.error(error);
                  return res.status(response.statusCode).end(error);
                } else if (response.statusCode === 200) {
                  log.info("Email sent successfully to Ping");
                  return res
                    .status(response.statusCode)
                    .end("Email sent successfully to Ping");
                } else {
                  log.error("Something went wrong at Ping Mail");
                  return res
                    .status(response.statusCode)
                    .end("Something went wrong at Ping Mail");
                }
              }
            }
          );
          contact.save();
          log.info("data inserted to DB");
          return res.status(200).end("data success submitted");
          // return res.status(response.statusCode).end("something went wrong");
        } catch (err) {
          log.error(err);
          return res.status(500).end("something went wrong");
        }
      } catch (err) {
        log.info("Payload validation Error");
        console.log(err);
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      }
    }
  );
  app.post("/livquik/quikwallet/getContactData",verifyAccess,async (req, res) => {
      log.info("Get Livquik Quikwallet data hit Received");
      const contactResult = mongooseschema.livquikQuikwallet;
      try {
        const result = await contactResult.find().sort({ createdAt: -1 });
        log.info("Data Getting Success from Contact");
        return res.status(200).json(result);
      } catch (err) {
        log.error(err);
        return res.status(500).end("Get Contact Something went wrong");
      }
    }
  );
  app.post("/livquik/quikwallet/filterbyDate",verifyAccess,async (req, res) => {
    log.info("Get Livquik Quikwallet filterbyDate hit Received");
    const contactResult = mongooseschema.livquikQuikwallet;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
      try {
        const result = await contactResult
          .find({
            createdAt: {
              $gte: new Date(startDate).setHours(00, 00, 00),
              $lt: new Date(endDate).setHours(23, 59, 59),
            },
          })
          .sort({ createdAt: -1 });
        log.info("Data filter Success from Livquik Contact");
        return res.status(200).json(result);
      } catch (err) {
        log.error(err);
        return res.status(500).end("Something went wrong in Contact filter");
      }
    }
  );
  //livquik contact us
  app.post("/livquik/contact-us/submit",apiLimiter,verifyAccess,async (req, res) => {
      log.info("Livquik contact-us API hit reached");
      let mobPat = /^[+]{1}(?:[0-9\-\(\)\/\.]\s?){6, 15}[0-9]{1}$/;
      let txtPat = /^[\w\-\s]+$/;
      const schema = Joi.object({
        name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
          "string.base": `"Name:Invalid data."`,
          "string.pattern.base": `Enter valid name`,
          "any.required": `"" is a required field`,
        }),
        email: Joi.string().email().min(8).max(50).required().messages({
          "string.base": `"Email:Invalid data."`,
          "string.email": `Enter valid email`,
          "any.required": `"" is a required field`,
        }),
        phone: Joi.number().required().messages({
          "string.base": `"Invalid format. Enter valid mobile number."`,
          "string.pattern.base": `Enter valid mobile number.`,
          "any.required": `"" is a required field`,
        }),
        companyName: Joi.string().regex(txtPat).messages({
          "string.base": `"Company Name:Invalid data."`,
          "string.pattern.base": `Enter valid company name`,
          "any.required": `"" is a required field`,
        }),
        msg: Joi.string().regex(txtPat).allow("").messages({
          "string.base": `"Message:Invalid data."`,
          "string.pattern.base": `Enter valid message`,
          "any.required": `"" is a required field`,
        }),
        url: Joi.string().uri().messages({
          "string.base": `"Invalid data."`,
          "string.uri": `"Enter valid url."`,
          "any.required": `"" is a required field`,
        }),
      });
      try {
        log.info("Payload validation check");
        const result = await schema.validateAsync(req.body);
        console.log(result);
        log.info("Payload validation successfull");
        const contact = mongooseschema.livquikContact({
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          companyName: req.body.companyName,
          message: req.body.msg,
          url: req.body.url,
        });
        try {
          contact.save();
          log.info("Data inserted to DB");
          return res.status(200).end("Data success submitted");
        } catch (err) {
          log.error(err);
          return res.status(500).end("Something went wrong in saving data");
        }
      } catch (err) {
        log.info("Payload validation Error");
        console.log(err);
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      }
    }
  );
  app.post("/livquik/contact-us/getData", verifyAccess, async (req, res) => {
    log.info("Get Livquik Contact data hit Received");
    const contactResult = mongooseschema.livquikContact;
    try {
      const result = await contactResult.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from Contact");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Get Contact Something went wrong");
    }
  });
  app.post("/livquik/contact-us/filterbyDate",verifyAccess,async (req, res) => {
      log.info("Get Livquik Contact data by filter date hit Received");
      const contactResult = mongooseschema.livquikContact;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      try {
        const result = await contactResult
          .find({
            createdAt: {
              $gte: new Date(startDate).setHours(00, 00, 00),
              $lt: new Date(endDate).setHours(23, 59, 59),
            },
          })
          .sort({ createdAt: -1 });
        log.info("Data filter Success from Livquik Contact");
        return res.status(200).json(result);
      } catch (err) {
        log.error(err);
        return res.status(500).end("Something went wrong in Contact filter");
      }
    }
  );
  //livquik careers
  app.post("/livquik/careers/submit", apiLimiter, async (req, res) => {
    log.info("Livquik careers API hit reached");
    let mobPat = /^[+]{1}(?:[0-9\-\(\)\/\.]\s?){6, 15}[0-9]{1}$/;
    let txtPat = /^[\w\-\s]+$/;
    const schema = Joi.object({
      firstname: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"" is a required field`,
      }),
      lastname: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"" is a required field`,
      }),
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"" is a required field`,
      }),
      phone: Joi.number().required().messages({
        "string.base": `"Invalid format. Enter valid mobile number."`,
        "string.pattern.base": `Enter valid mobile number.`,
        "any.required": `"" is a required field`,
      }),
      position: Joi.string().regex(txtPat).messages({
        "string.base": `"Company Name:Invalid data."`,
        "string.pattern.base": `Enter valid company name`,
        "any.required": `"" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      const result = await schema.validateAsync(req.body);
      console.log(result);
      log.info("Payload validation successfull");
      const contact = mongooseschema.livquikCareer({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        phone: req.body.phone,
        position: req.body.position,
        files: {},
      });
      try {
        contact.save();
        log.info("data inserted to DB");
        return res.status(200).end("data success submitted");
      } catch (err) {
        log.error(err);
        return res.status(500).end("something went wrong");
      }
    } catch (err) {
      log.info("Payload validation Error");
      console.log(err);
      return res.status(400).send({
        Error: {
          title: "Bad request",
          message: err.details[0].message,
        },
      });
    }
  });
  app.post("/livquik/careers/getData", verifyAccess, async (req, res) => {
    log.info("Get Livquik Careers data hit Received");
    const contactResult = mongooseschema.livquikCareer;
    try {
      const result = await contactResult.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from Careers data");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Get Careers data Something went wrong");
    }
  });
  app.post("/livquik/careers/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get Livquik Careers data by filterdate hit Received");
    const contactResult = mongooseschema.livquikCareer;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await contactResult
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from Livquik Contact");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Something went wrong in Contact filter");
    }
  });
  //Upload files
  app.post("/livquik/careers/uploadFiles",upload.array("files"),
    async function (req, res) {
      log.info("S3 Bucket Upload Called : ");
      let firstname = req.body.firstname;
      let lastname = req.body.lastname;
      let unlink = req.files;
      console.log(unlink);
      async function s3Upload(files) {
        const params = files.map((file) => {
          return {
            Bucket: constant.AWS_BUCKET_NAME,
            Body: fs.createReadStream(file.path),
            Key: "livquik-careers" + "/" + file.filename,
          };
        });
        return await Promise.all(
          params.map((param) => s3.upload(param).promise())
        );
      }
      try {
        var data = Object.keys(req.body);
        data.splice(0, 2);
        var keys = data;
        let value = req.files;
        let document = {};
        const result = await s3Upload(req.files);
        for (i = 0; i < req.files.length; i++) {
          Object.assign(document, {
            originalname: value[i].originalname,
            uploadname: value[i].filename,
            filepath: result[i].Key,
            location: result[i].Location,
          });
        }
        log.info("Files uploaded successfully to S3");

        if (result) {
          mongooseschema.livquikCareer
            .find({
              firstname: req.body.firstname,
              lastname: req.body.lastname,
              phone: req.body.phone,
            })
            .exec((err, resultData) => {
              if (err) {
                log.error(err);
                res.status(500).send("Something went wrong");
              }
              if (resultData[0]) {
                console.log(document);
                let query = {
                  firstname: req.body.firstname,
                  lastname: req.body.lastname,
                  phone: req.body.phone,
                };
                let newData = { $set: { files: document } };
                mongooseschema.livquikCareer
                  .updateOne(query, newData)
                  .exec((err, success) => {
                    if (err) {
                      log.error(err);
                      return res.status(500).send("Something went wrong");
                    }
                    if (success) {
                      res.status(200).send("Career form submission success");
                      log.info("S3 file details saved successfully in DB");
                      fs.unlink(req.files[0].path, function (err) {
                        if (err) return log.error(err);
                        log.info("File deleted from folders successfully");
                      });
                    }
                  });
              }
            });
        }
      } catch (err) {
        log.error(err.message + ":" + err.statusCode);
        res.status(err.statusCode).send(err);
      }
      log.info("End of S3 Upload Method");
    }
  );
  // Get Files from User Data
  app.post("/livquik/careers/getFiles", async function (req, res) {
    log.info("Accessing S3-Bucket for user documents.");
    let files;
    let key;
    try {
      await mongooseschema.livquikCareer
        .find({
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          phone: req.body.phone,
        })
        .exec(function (err, result) {
          if (err) {
            log.error(err);
            res.status(500).send("Something went wrong in getting data");
          }
          if (result[0]) {
            log.info("Successfully retrieved data for Accessing S3 files");
            files = result[0].files.filepath;
            key = result[0].files.originalname;
            console.log(files, key);
            s3GetFiles(files, key);
          } else {
            log.info("No files found");
            res.status(404).send("No files found");
          }
        });
      async function s3GetFiles(filePath, key) {
        try {
          const params = {
            Bucket: constant.AWS_BUCKET_NAME,
            Key: filePath,
          };
          let ext = path.extname(key);
          console.log(ext);
          const data = await s3.getObject(params).promise();
          console.log(data);
          let base64 = data.Body.toString("base64");
          return res
            .status(200)
            .send({ s3data: data, base64: base64, ext: ext });
        } catch (e) {
          log.error(`Could not retrieve file from S3: ${e.message}`);
          e.statusCode === 403
            ? res.status(e.statusCode).send(e.message)
            : res.status(500).send("Something went wrong");
        }
      }
      // async function s3GetFiles(fileData) {
      //   const params = filePath.map(file => {
      //     return fs.readFileSync("./dirStorage/uploads/" + fileData.path, { encoding: 'base64' });
      //   })
      //   let s3Files = {}
      //   let type = ""
      //   let ext = ""
      //   for (i = 0; i < keys.length; i++) {
      //     ext = path.extname(files[keys[i]].originalname)
      //     switch (ext) {
      //       case ".doc" || ".DOC": type = "application/doc";
      //         break;

      //       case ".docx" || ".DOCX": type = "application/docx";
      //         break;

      //       case ".pdf" || ".PDF": type = "application/pdf";
      //         break;
      //     }
      //     Object.assign(s3Files, {
      //       [keys[i]]: {
      //         "base64File": `data:${type};base64,` + params[i],
      //         "fileType": path.extname(files[keys[i]].originalname)
      //       }
      //     })
      //   }
      //   log.info('S3 fetching files successfull')
      //   await res.status(200).send(s3Files);
      // }
    } catch (err) {
      log.error(err);
      res.status(500).send(err);
      return;
    }
  });
  //seamless event
  app.get("/seamless/arabic", (req, res) => {
    const filePath = __dirname + "/M2P-Arabic.pdf";
    res.download(filePath, "M2P-Arabic.pdf", (err) => {
      if (err) {
        res.send("Problem downloading the file");
      }
    });
  });
  app.get("/seamless/english", (req, res) => {
    const filePath = __dirname + "/M2P-English.pdf";
    res.download(filePath, "M2P-English.pdf", (err) => {
      if (err) {
        res.send("Problem downloading the file");
      }
    });
  });
  app.post("/seamless/formSubmit", verifyAccess, async (req, res) => {
    log.info('Seamless api hit received');
    // try {
    //   const records = [req.body];
    //   await csvWriter.writeRecords(records)
    //   .then(() => {
    //     res.status(200).send('Success')
    //     log.info('Data write in csv file successful');
    //   });
    // } catch (err) {
    //   log.error(err,"Error");
    //   res.send("Something went wrong");
    // }
    var style
    mongooseschema.seamlessContact.find({ 'email': req.body.email }).exec((err, result) => {
      if (err) {
        log.error(err)
        return res.status(500).json('Something went wrong')
      }
      if (result) {
        if (result.length === 3) {
          log.error('Contact user reached limit')
          return res.status(429).json('Limit has been reached')
        } else {
          const contact = mongooseschema.seamlessContact({
            email: req.body.email,
            insight: req.body.insight,
          });
          try {
            contact.save();
            log.info("data inserted to DB");
            return res.status(200).end("data success submitted");
          } catch (err) {
            log.error(err);
            return res.status(500).end("something went wrong");
          }
        }
      }
    })
  });
  app.post("/seamless/getData", verifyAccess, async (req, res) => {
    log.info("Get Seamless data hit Received");
    const contactResult = mongooseschema.seamlessContact;
    try {
      const result = await contactResult.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from Contact");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Get Contact Something went wrong");
    }
  });
  app.post("/seamless/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for footerContact hit Received");
    const contactResult = mongooseschema.seamlessContact;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await contactResult
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from FooterContact");
      return res.status(200).json(result);
    } catch (err) {
      log.error(err);
      return res.status(500).end("Something went wrong in Contact filter");
    }
  });
  app.get("/seamless/download",async(req,res)=>{
    console.log(req.body);
    res.send(req.body)
    // if(req.body.language==="English"){
    //   const filePath = __dirname + "/M2P-International.pdf";
    //   res.download(filePath,"test-1.pdf",(err) => {
    //     if (err) {res.send("Problem downloading the file")}
    //   });
    // }
    // if(req.body.language==="Arabic"){
    //   const filePath = __dirname + "/M2P-Arabic.pdf";
    //   res.download(filePath,"M2P-Arabic.pdf",(err) => {
    //     if (err) {res.send("Problem downloading the file")}
    //   });
    // }
  })
  // Paylater
  app.post("/paylater/submit", apiLimiter, verifyAccess, async (req, res) => {
    log.info("Pay later+ Contact Submit API hit reached");
    let txtPat = /^[\w\-\s]+$/;
    let compRegex = new RegExp("^[ A-Za-z0-9_?]*$");
    const schema = Joi.object({
      name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"Name" is a required field`,
      }),
      company: Joi.string().regex(compRegex).required().messages({
        "string.base": `"Company name:Invalid data."`,
        "string.pattern.base": `Enter valid company name`,
        "any.required": `"Company name" is a required field`,
      }),
      mobileNum: Joi.string()
        .regex(/^[0-9()+]/)
        .required()
        .messages({
          "string.base": `"Mobile number:Invalid data."`,
          "string.email": `Enter valid Mobile number`,
          "any.required": `"Mobile number" is a required field`,
        }),
    });
    try {
      log.info("Payload validation check");
      await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      const paylaterData = mongooseschema.paylater({
        name: req.body.name,
        mobileNum: req.body.mobileNum,
        company: req.body.company,
      });
      try {
        paylaterData.save();
        log.info("Paylater Data inserted to DB");
        if (req.body.company === "") {
          var style = `style="display:none;"`;
        }
        let jdata = {
          business: "M2PSITE",
          transactionType: "m2p_site_mail_notify",
          emailNotifyData: {
            to_email: "rajeshk@m2pfintech.com",
            title: "Hi",
            body: `<div style="margin:auto; height: fit-content;">
                  <div style=" width: 580px; margin: auto; background-color:#FFFFFF; padding-top: 30px;">
                      <div style="text-align: center;"> <img src="https://m2p-website-static-files.s3.ap-south-1.amazonaws.com/images/m2p-logo.png" alt="" style="width: 70px; height: 70px;" >
                      </div>
                      <p style="text-align: center; font-size: 18px; line-height: 22px;">Pay later+ Form Submission</p>
                      <table class="table" style=" padding: 20px; font-size: 14px; line-height: 17px; margin: auto;" >

                          <tr>
                              <td style="padding: 15px 60px 15px 70px; border-bottom: #F3F3F3 1px solid; text-align: left; width: 43%;">Name</td>
                              <td style="padding: 15px 10px 15px 30px; border-bottom: #F3F3F3 1px solid; ">${req.body.name}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Mobile Number</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.mobileNum}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Company</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.company}</td>
                          </tr>
                      </table>
                  </div>
              </div>`,
          },
        };
        request(
          {
            url: constant.EMAIL_NOTIFY_PRODUCTION,
            method: "POST",
            headers: {
              "content-Type": "application/json",
            },
            body: JSON.stringify(jdata),
          },
          function (error, response, body) {
            if (error) {
              log.info(error);
              return res
                .status(response.statusCode)
                .end("something went wrong");
            } else {
              if (response.statusCode === 500) {
                log.error(error);
                return res.status(response.statusCode).end(error);
              } else if (response.statusCode === 200) {
                log.info("Email sent successfully to Ping");
                return res.status(200).end("Data success submitted");
              } else {
                log.error("Something went wrong at Ping Mail");
                return res
                  .status(response.statusCode)
                  .end("Something went wrong at Ping Mail");
              }
            }
          }
        );
      } catch (err) {
        log.error("Something went wrong in pay later+ API");
        log.error(err);
        return res.status(500).end("Something went wrong in pay later+ API");
      }
    } catch (err) {
      if (err.details[0].message) {
        log.error(`Payload validation Error: ${err.details[0].message}`);
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      } else {
        log.error("Something went wrong in pay later+ API");
        log.error(err);
        return res.status(500).send("Something went wrong in pay later+ API");
      }
    }
  });
  app.post("/paylater/getData", verifyAccess, async (req, res) => {
    log.info("Get Pay later+ data hit Received");
    const data = mongooseschema.paylater;
    try {
      const result = await data.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from Pay later+");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting pay later+ data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting pay later+ data");
    }
  });
  app.post("/paylater/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for pay later+ hit Received");
    const data = mongooseschema.paylater;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await data
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from Paylater");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting pay later+ filter data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting pay later+ filter data");
    }
  });

  //White papers

  app.post("/m2p/whitepapers/submit",apiLimiter,verifyAccess,async (req, res) => {
      log.info("Whitepaper request Submit API hit reached");
      let txtPat = /^[\w\-\s]+$/;
      const schema = Joi.object({
        name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
          "string.base": `"Name:Invalid data."`,
          "string.pattern.base": `Enter valid name`,
          "any.required": `"Name" is a required field`,
        }),
        email: Joi.string().email().min(8).max(50).required().messages({
          "string.base": `"Email:Invalid data."`,
          "string.email": `Enter valid email`,
          "any.required": `"Email" is a required field`,
        }),
        mobileNum: Joi.string()
          .regex(/^[0-9()+]/)
          .required()
          .messages({
            "string.base": `"Mobile number:Invalid data."`,
            "string.email": `Enter valid Mobile number`,
            "any.required": `"Mobile number" is a required field`,
          }),
        company: Joi.string().alphanum().required().messages({
          "string.base": `"Company name:Invalid data."`,
          "string.alphanum": `Enter valid company name`,
          "any.required": `"Company name" is a required field`,
        }),
        category: Joi.string().regex(txtPat).min(3).max(50).required().messages({
          "string.base": `"Category:Invalid data."`,
          "string.pattern.base": `Enter valid category`,
          "any.required": `"Category" is a required field`,
        }),
        url: Joi.string().uri().messages({
          "string.base": `"Invalid data."`,
          "string.uri": `"Enter valid url."`,
          "any.required": `"Url" is a required field`,
        }),
      });
      try {
        log.info("Payload validation check");
        await schema.validateAsync(req.body);
        log.info("Payload validation successfull");
        const whitePapersData = mongooseschema.whitePapers({
          name: req.body.name,
          email: req.body.email,
          mobileNum: req.body.mobileNum,
          company: req.body.company,
          category: req.body.category,
          url: req.body.url,
        });
        try {
          whitePapersData.save();
          log.info("Paylater Data inserted to DB");
          if (req.body.company === "") {
            var style = `style="display:none;"`;
          }
          let jdata = {
            business: "M2PSITE",
            transactionType: "m2p_site_mail_notify",
            emailNotifyData: {
              to_email: "sivakumar.raja@m2pfintech.com vidyalakshmi.a@m2pfintech.com",
              title: "Hi",
              body: `<div style="margin:auto; height: fit-content;">
                  <div style=" width: 580px; margin: auto; background-color:#FFFFFF; padding-top: 30px;">
                      <div style="text-align: center;"> <img src="https://m2p-website-static-files.s3.ap-south-1.amazonaws.com/images/m2p-logo.png" alt="" style="width: 70px; height: 70px;" >
                      </div>
                      <p style="text-align: center; font-size: 18px; line-height: 22px;">${req.body.category === "Report" ? "Report Request" : "White Paper Request" }</p>
                      <table class="table" style=" padding: 20px; font-size: 14px; line-height: 17px; margin: auto;" >

                          <tr>
                              <td style="padding: 15px 60px 15px 70px; border-bottom: #F3F3F3 1px solid; text-align: left; width: 43%;">Name</td>
                              <td style="padding: 15px 10px 15px 30px; border-bottom: #F3F3F3 1px solid; ">${req.body.name}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Email</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.email}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Company</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.company}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Category</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.category}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Mobile Num</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.mobileNum}</td>
                          </tr>
                      </table>
                  </div>
              </div>`,
            },
          };
          request(
            {
              url: constant.EMAIL_NOTIFY_PRODUCTION,
              method: "POST",
              headers: {
                "content-Type": "application/json",
              },
              body: JSON.stringify(jdata),
            },
            function (error, response, body) {
              if (error) {
                log.info(error);
                return res
                  .status(response.statusCode)
                  .end("something went wrong");
              } else {
                if (response.statusCode === 500) {
                  log.error(error);
                  return res.status(response.statusCode).end(error);
                } else if (response.statusCode === 200) {
                  log.info("Email sent successfully to Ping");
                  return res.status(200).end("Data success submitted");
                } else {
                  log.error("Something went wrong at Ping Mail");
                  return res
                    .status(response.statusCode)
                    .end("Something went wrong at Ping Mail");
                }
              }
            }
          );
        } catch (err) {
          log.error("Something went wrong in whitepapers API");
          log.error(err);
          return res.status(500).end("Something went wrong in whitepapers API");
        }
      } catch (err) {
        if (err.details[0].message) {
          log.error(`Payload validation Error: ${err.details[0].message}`);
          return res.status(400).send({
            Error: {
              title: "Bad request",
              message: err.details[0].message,
            },
          });
        } else {
          log.error(err);
          return res
            .status(500)
            .send("Something went wrong in whitepapers API");
        }
      }
    }
  );
  app.post("/m2p/whitepapers/getData", verifyAccess, async (req, res) => {
    log.info("Get Whitepapers data hit Received");
    const data = mongooseschema.whitePapers;
    try {
      const result = await data.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from Paylater");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting Whitepapers data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting Whitepapers data");
    }
  });
  app.post("/m2p/whitepapers/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for Whitepapers data hit Received");
    const data = mongooseschema.whitePapers;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await data
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from Whitepapers");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting Whitepapers filter data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in Whitepapers filter data");
    }
  });
  app.post("/m2p/whitepapers/filterbyCategory", async (req, res) => {
    log.info("Get filterbyCategory for Whitepapers data hit Received");
    if(req.body == {} ){
      return res.status(500).send("Empty payload")
    }
    const data = mongooseschema.whitePapers;
    if(req.body.startDate && req.body.endDate){
      const category = req.body.category;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      try {
        const result = await data.find({"category":category,createdAt: {$gte: new Date(startDate).setHours(00, 00, 00),$lt: new Date(endDate).setHours(23, 59, 59)}}).sort({ createdAt: -1 });
        log.info("Data filter Success from Whitepapers");
        return res.status(200).json(result);
      } catch (err) {
        log.error("Something went wrong in getting Whitepapers filter data");
        log.error(err);
        return res
          .status(500)
          .end("Something went wrong in Whitepapers filter data");
      }
    }
    try {
      const category = req.body.category;
      const result = await data.find({"category":category}).sort({ createdAt: -1 });
      log.info("Data filter Success from Whitepapers");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting Whitepapers filter data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in Whitepapers filter data");
    }
  });


  // M2P Mailer

  app.post("/m2p/mailer", async (req, res) => {
    log.info("M2P Mailer api hit received");
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, constant.UPLOAD_FILE_PATH);
      },
      filename: function (req, file, cb) {
        let userName = req.body.firstname + "_" + req.body.lastname;
        let fileName =
          userName +
          "_" +
          file.originalname.split(".")[0] +
          "_" +
          moment().format("YYYY-MM-DD HH:mm");
        let fileNameToReplace =
          fileName.replace(/\s+/g, "_").toLowerCase() +
          path.extname(file.originalname);
        cb(null, fileNameToReplace);
      },
    });
    const upload = multer({
      storage: storage,
      fileFilter: function (req, file, cb) {
        let fileType = [".pdf", ".docx", ".doc"];
        if (fileType.includes(path.extname(file.originalname))) {
          cb(null, true);
        } else {
          cb(new Error("Invalid file format"));
        }
      },
      limits: { fileSize: constant.FILE_UPLOAD_SIZE },
    }).single("file");
    let readHTMLFile = function (path, callback) {
      fs.readFile(path, { encoding: "utf-8" }, function (err, html) {
        if (err) {
          console.log(err);
          callback(err);
        } else {
          callback(null, html);
        }
      });
    };
    try {
      upload(req, res, function (error) {
        if (error instanceof multer.MulterError) {
          log.error({ message: error.message });
          res.status(400).send({ message: error.message });
        } else if (error) {
          log.error({ message: error.message });
          res.status(400).send({ message: error.message });
        } else {
          let fileDetails = req.file;
          log.info(JSON.stringify({ Filedetails: fileDetails }));
          let format = fileDetails.originalname.split(".");
          // console.log(fileDetails.originalname);
          // console.log(format);
          let transporter = nodemailer.createTransport({
            host: "email-smtp.ap-south-1.amazonaws.com",
            port: 587,
            secure: false,
            auth: {
              user: "AKIAXLFABRHLXMM4OU5M",
              pass: "BFv5moWQw2zQVywR4w32CF5sgKZf/BtHKEH7e+VB+0ar",
            },
          });
          if (req.body.career === "BETTERHALF") {
            log.info(`M2P Mailer for: ${req.body.career}`);
            readHTMLFile(
              "mailTemplate/betterHalf-Mailtemp.html",
              function (err, html) {
                if (err) {
                  log.error("error reading file", JSON.stringify(err));
                  res.status(500).send("Something went wrong");
                  return;
                }
                let template = handleBars.compile(html);
                let replacements = req.body;
                let htmlToSend = template(replacements);
                let attachment = fs.readFileSync(fileDetails.path);
                let mailOptions = {
                  from: "BetterHalf <betterhalf@m2pfintech.com>",
                  to: "betterhalf@m2pfintech.com",
                  subject: "Betterhalf Application",
                  html: htmlToSend,
                  attachments: [
                    {
                      filename: `${
                        req.body.firstname + req.body.lastname
                      }-resume.${format[1]}`,
                      content: attachment,
                    },
                  ],
                };
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    log.error(JSON.stringify(error.message));
                    res.status(500).send(error);
                  } else {
                    log.info("Email sent Successfully:" + JSON.stringify(info));
                    res.status(200).send("Email sent Successfully");
                    fs.unlink(req.file.path, function (err) {
                      if (err) return log.error(err);
                      log.info("File deleted from folder successfully");
                    });
                  }
                });
              }
            );
          } else if (req.body.career === "MOONLIGHT") {
            log.info(`M2P Mailer for: ${req.body.career}`);
            readHTMLFile(
              "mailTemplate/moonlight-Mailtemp.html",
              function (err, html) {
                if (err) {
                  log.error("error reading file", JSON.stringify(err));
                  res.status(500).send("Something went wrong");
                  return;
                }
                let template = handleBars.compile(html);
                let replacements = req.body;
                let htmlToSend = template(replacements);
                let attachment = fs.readFileSync(fileDetails.path);
                let mailOptions = {
                  from: "Moonlight <moonlight@m2pfintech.com>",
                  to: "moonlight@m2pfintech.com",
                  subject: "Moonlight Application",
                  html: htmlToSend,
                  attachments: [
                    {
                      filename: `${
                        req.body.firstname + " " + req.body.lastname
                      }-resume.${format[1]}`,
                      content: attachment,
                    },
                  ],
                };
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    log.error(JSON.stringify(error.message));
                    res.status(500).send(error);
                  } else {
                    log.info("Email sent Successfully:" + JSON.stringify(info));
                    res.status(200).send("Email sent Successfully");
                    fs.unlink(req.file.path, function (err) {
                      if (err) return log.error(err);
                      log.info("File deleted from folders successfully");
                    });
                  }
                });
              }
            );
          } else {
            log.error("Unauthorized mailer request. Invalid Career");
            return res.status(403).send("Unauthorized Request");
          }
        }
      });
    } catch (error) {
      log.error(error, "catch error");
      res.status(500).send("Somethng went wrong");
    }
  });

  // MFI Form

  app.post("/mfi/submit", apiLimiter, verifyAccess, async (req, res) => {
    log.info("MFI Contact Submit API hit reached");
    let txtPat = /^[\w\-\s]+$/;
    let compRegex = new RegExp("^[ A-Za-z0-9_?]*$");
    const schema = Joi.object({
      name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"Name" is a required field`,
      }),
      company: Joi.string().regex(compRegex).required().messages({
        "string.base": `"Company name:Invalid data."`,
        "string.pattern.base": `Enter valid company name`,
        "any.required": `"Company name" is a required field`,
      }),
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"Email" is a required field`,
      }),
      mobileNum: Joi.string()
        .regex(/^[0-9()+]/)
        .required()
        .messages({
          "string.base": `"Mobile number:Invalid data."`,
          "string.email": `Enter valid Mobile number`,
          "any.required": `"Mobile number" is a required field`,
        }),
      url: Joi.string().required().messages({
          "string.base": `"URL:Invalid data."`,
          "string.url": `Enter url`,
          "any.required": `"URL" is a required field`,
        }),
    });
    try {
      log.info("Payload validation check");
      await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      const paylaterData = mongooseschema.mfi({
        name: req.body.name,
        company: req.body.company,
        email: req.body.email,
        mobileNum: req.body.mobileNum,
        url: req.body.url,
      });
      try {
        paylaterData.save();
        log.info("Paylater Data inserted to DB");
        if (req.body.company === "") {
          var style = `style="display:none;"`;
        }
        let jdata = {
          business: "M2PSITE",
          transactionType: "m2p_site_mail_notify",
          emailNotifyData: {
            to_email: "chinar@m2pfintech.com,anurag@m2pfintech.com,boneym@m2pfintech.com",
            title: "Hi",
            body: `<div style="margin:auto; height: fit-content;">
                  <div style=" width: 580px; margin: auto; background-color:#FFFFFF; padding-top: 30px;">
                      <div style="text-align: center;"> <img src="https://m2p-website-static-files.s3.ap-south-1.amazonaws.com/images/m2p-logo.png" alt="" style="width: 70px; height: 70px;" >
                      </div>
                      <p style="text-align: center; font-size: 18px; line-height: 22px;">MFI Form Submission</p>
                      <table class="table" style=" padding: 20px; font-size: 14px; line-height: 17px; margin: auto;" >

                          <tr>
                              <td style="padding: 15px 60px 15px 70px; border-bottom: #F3F3F3 1px solid; text-align: left; width: 43%;">Name</td>
                              <td style="padding: 15px 10px 15px 30px; border-bottom: #F3F3F3 1px solid; ">${req.body.name}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Company</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.company}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Email</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.email}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Mobile Number</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.mobileNum}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">URL</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.url}</td>
                          </tr>
                      </table>
                  </div>
              </div>`,
          },
        };
        request(
          {
            url: constant.EMAIL_NOTIFY_PRODUCTION,
            method: "POST",
            headers: {
              "content-Type": "application/json",
            },
            body: JSON.stringify(jdata),
          },
          function (error, response, body) {
            if (error) {
              log.info(error);
              return res
                .status(response.statusCode)
                .end("something went wrong");
            } else {
              if (response.statusCode === 500) {
                log.error(error);
                return res.status(response.statusCode).end(error);
              } else if (response.statusCode === 200) {
                log.info("Email sent successfully to Ping");
                return res.status(200).end("Data success submitted");

                // let jdata = {
                //   business: "M2PSITE",
                //   transactionType: "m2p_site_mail_notify",
                //   emailNotifyData: {
                //     to_email: req.body.email,
                //     title: "Thank You for Submitting the Form",
                //     body: `

                //     Dear ${req.body.name}, <br><br>

                //     We appreciate your interest in our Microfinance Lending Suite. <br> <br>

                //     Our Business Development Representative in the Philippines will get in touch with you promptly.<br><br>

                //     In the meantime, if you have any urgent inquiries or require immediate assistance, please feel free to contact our team at business@m2pfintech.com.<br><br>

                //     Visit www.m2pfintech.com to know how our technology is empowering banks, fintechs, and startups around the world.<br><br>

                //     Once again, thank you for choosing M2P. We look forward to building a successful and rewarding relationship with you.<br><br>

                //     Best Regards,<br>
                //     Team M2P<br><br>

                //     P.S. This is an auto-generated email. Please do not reply to this email.
                //     `,
                //   },
                // };
                // request(
                //   {
                //     url: constant.EMAIL_NOTIFY_PRODUCTION,
                //     method: "POST",
                //     headers: {
                //       "content-Type": "application/json",
                //     },
                //     body: JSON.stringify(jdata),
                //   },
                //     function (error , response, body ){
                //       if (error) {
                //         log.info(error);
                //         return res
                //           .status(response.statusCode)
                //           .end("something went wrong");
                //       }else{
                //         if (response.statusCode === 500) {
                //           log.error(error);
                //           return res.status(response.statusCode).end(error);
                //         }else if (response.statusCode === 200) {
                //           log.info("Email sent successfully to Contacted person");
                //         }
                //       }
                //     }
                //   )
              } else {
                log.error("Something went wrong at Ping Mail");
                return res
                  .status(response.statusCode)
                  .end("Something went wrong at Ping Mail");
              }
            }
          }
        );
      } catch (err) {
        log.error("Something went wrong in MFI API");
        log.error(err);
        return res.status(500).end("Something went wrong in MFI API");
      }
    } catch (err) {
      if (err.details[0].message) {
        log.error(`Payload validation Error: ${err.details[0].message}`);
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      } else {
        log.error("Something went wrong in MFI API");
        log.error(err);
        return res.status(500).send("Something went wrong in MFI API");
      }
    }
  });
  app.post("/mfi/getData", verifyAccess, async (req, res) => {
    log.info("MFI data hit Received");
    const data = mongooseschema.mfi;
    try {
      const result = await data.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from MFI");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting MFI data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting MFI data");
    }
  });
  app.post("/mfi/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for MFI hit Received");
    const data = mongooseschema.mfi;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await data
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from Paylater");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting MFI filter data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting MFI filter data");
    }
  });

  //  GFF
  app.post("/gff/submit", apiLimiter, verifyAccess, async (req, res) => {
    log.info("GFF Contact Submit API hit reached");
    let txtPat = /^[\w\-\s]+$/;
    let compRegex = new RegExp("^[ A-Za-z0-9_?]*$");
    const schema = Joi.object({
      name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"Name" is a required field`,
      }),
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"Email" is a required field`,
      }),
      companyName: Joi.string().regex(compRegex).messages({
        "string.base": `"Company name:Invalid data."`,
        "string.pattern.base": `Enter valid company name`,
        "any.required": `"" is a required field`,
        "string.pattern.base": "Enter valid company name",
      }),
      contact: Joi.string().regex(/^[0-9()+]/).required().messages({
          "string.base": `"Mobile number:Invalid data."`,
          "string.email": `Enter valid Mobile number`,
          "any.required": `"Mobile number" is a required field`,
      }),
      insight: Joi.string().min(2).max(3).required().messages({
        "string.base": `"Insight:Invalid data."`,
        "string.insight": `Enter valid Insight`,
        "string.min": `Value should be min Two letters`,
        "string.max": `Value should be max Three letters`,
        "any.required": `"Insight" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      const gffData = mongooseschema.globalFintech({
        name: req.body.name,
        email: req.body.email,
        companyName: req.body.companyName,
        contact: req.body.contact,
        insight: req.body.insight,
        url: req.body.url,
      });
      try {
        gffData.save();
        log.info("GFF Data inserted to DB");
        sendMail("rajeshk@m2pfintech.com,aeishna.r@m2pfintech.com","mailTemplate/global-fintech.html", req.body, req, res);
        sendThankYouMail ("mailTemplate/GFF-thankYou.html", req.body, req, res)
      } catch (err) {
        log.error("Something went wrong in GFF API");
        log.error(err);
        return res.status(500).end("Something went wrong in GFF API");
      }
    } catch (err) {
      if (err.details[0].message) {
        log.error(`Payload validation Error: ${err.details[0].message}`);
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      } else {
        log.error("Something went wrong in GFF API");
        log.error(err);
        return res.status(500).send("Something went wrong in GFF API");
      }
    }
  });
  app.post("/gff/getData", verifyAccess, async (req, res) => {
    log.info("GFF data hit Received");
    const data = mongooseschema.globalFintech;
    try {
      const result = await data.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from GFF");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting GFF data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting GFF data");
    }
  });
  app.post("/gff/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for GFF hit Received");
    const data = mongooseschema.globalFintech;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await data
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from Paylater");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting GFF filter data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting GFF filter data");
    }
  });
   //  SFF
   app.post("/sff/submit", apiLimiter, verifyAccess, async (req, res) => {
    log.info("SFF Contact Submit API hit reached");
    let txtPat = /^[\w\-\s]+$/;
    let compRegex = new RegExp("^[ A-Za-z0-9_?]*$");
    const schema = Joi.object({
      name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"Name" is a required field`,
      }),
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"Email" is a required field`,
      }),
      companyName: Joi.string().regex(compRegex).messages({
        "string.base": `"Company name:Invalid data."`,
        "string.pattern.base": `Enter valid company name`,
        "any.required": `"" is a required field`,
        "string.pattern.base": "Enter valid company name",
      }),
      contact: Joi.string().regex(/^[0-9()+]/).required().messages({
          "string.base": `"Mobile number:Invalid data."`,
          "string.email": `Enter valid Mobile number`,
          "any.required": `"Mobile number" is a required field`,
      }),
      insight: Joi.string().min(2).max(3).required().messages({
        "string.base": `"Insight:Invalid data."`,
        "string.insight": `Enter valid Insight`,
        "string.min": `Value should be min Two letters`,
        "string.max": `Value should be max Three letters`,
        "any.required": `"Insight" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      const gffData = mongooseschema.singaporeFintech({
        name: req.body.name,
        email: req.body.email,
        companyName: req.body.companyName,
        contact: req.body.contact,
        insight: req.body.insight,
        url: req.body.url,
      });
      try {
        gffData.save();
        log.info("GFF Data inserted to DB");
        sendMail("rajeshk@m2pfintech.com,aeishna.r@m2pfintech.com","mailTemplate/sff-fintech.html", req.body, req, res);
        sendThankYouMail ("mailTemplate/SFF-thankYou.html", req.body, req, res)
      } catch (err) {
        log.error("Something went wrong in SFF API");
        log.error(err);
        return res.status(500).end("Something went wrong in SFF API");
      }
    } catch (err) {
      if (err.details[0].message) {
        log.error(`Payload validation Error: ${err.details[0].message}`);
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      } else {
        log.error("Something went wrong in GFF API");
        log.error(err);
        return res.status(500).send("Something went wrong in GFF API");
      }
    }
  });
  app.post("/sff/getData", verifyAccess, async (req, res) => {
    log.info("SFF data hit Received");
    const data = mongooseschema.singaporeFintech;
    try {
      const result = await data.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from SFF");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting SFF data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting SFF data");
    }
  });
  app.post("/sff/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for SFF hit Received");
    const data = mongooseschema.singaporeFintech;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await data
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from Paylater");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting SFF filter data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting SFF filter data");
    }
  });
   //  JTF
   app.post("/gff/join-the-fun/submit", verifyAccess, async (req, res) => {
    log.info("Join the fun Submit API hit reached");
    let txtPat = /^[\w\-\s]+$/;
    let compRegex = new RegExp("^[ A-Za-z0-9_?]*$");
    const schema = Joi.object({
      name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"Name" is a required field`,
      }),
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"Email" is a required field`,
      }),
      companyName: Joi.string().regex(compRegex).messages({
        "string.base": `"Company name:Invalid data."`,
        "string.pattern.base": `Enter valid company name`,
        "any.required": `"" is a required field`,
        "string.pattern.base": "Enter valid company name",
      }),
      contact: Joi.string().regex(/^[0-9()+]/).required().messages({
          "string.base": `"Mobile number:Invalid data."`,
          "string.email": `Enter valid Mobile number`,
          "any.required": `"Mobile number" is a required field`,
      }),
      insight: Joi.string().min(2).max(3).required().messages({
        "string.base": `"Insight:Invalid data."`,
        "string.insight": `Enter valid Insight`,
        "string.min": `Value should be min Two letters`,
        "string.max": `Value should be max Three letters`,
        "any.required": `"Insight" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      const joinTheFunData = mongooseschema.jtfchema({
        name: req.body.name,
        email: req.body.email,
        companyName: req.body.companyName,
        contact: req.body.contact,
        insight: req.body.insight,
      });
      try {
        joinTheFunData.save();
        log.info("JTF Data inserted to DB");
        sendMail("rajeshk@m2pfintech.com,aeishna.r@m2pfintech.com","mailTemplate/join-the-fun.html", req.body, req, res);
        sendThankYouMail ("mailTemplate/JTF-thankYou.html", req.body, req, res)
      } catch (err) {
        log.error("Something went wrong in GFF API");
        log.error(err);
        return res.status(500).end("Something went wrong in JFT API");
      }
    } catch (err) {
      if (err.details[0].message) {
        log.error(`Payload validation Error: ${err.details[0].message}`);
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      } else {
        log.error("Something went wrong in JFT API");
        log.error(err);
        return res.status(500).send("Something went wrong in JFT API");
      }
    }
  });
  app.post("/gff/join-the-fun/getData", verifyAccess, async (req, res) => {
    log.info("GFF data hit Received");
    const data = mongooseschema.jtfchema;
    try {
      const result = await data.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from JFT");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting JFT data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting JFT data");
    }
  });
  app.post("/gff/join-the-fun/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for GFF hit Received");
    const data = mongooseschema.jtfchema;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await data
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from Paylater");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting GFF filter data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting GFF filter data");
    }
  });

   //  AWS Marketplace
  app.post("/aws-marketplace/submit", apiLimiter, verifyAccess, async (req, res) => {
    log.info("AWS Marketplace Contact Submit API hit reached");
    let txtPat = /^[\w\-\s]+$/;
    let compRegex = new RegExp("^[ A-Za-z0-9_?]*$");
    const schema = Joi.object({
      name: Joi.string().regex(txtPat).min(3).max(50).required().messages({
        "string.base": `"Name:Invalid data."`,
        "string.pattern.base": `Enter valid name`,
        "any.required": `"Name" is a required field`,
      }),
      email: Joi.string().email().min(8).max(50).required().messages({
        "string.base": `"Email:Invalid data."`,
        "string.email": `Enter valid email`,
        "any.required": `"Email" is a required field`,
      }),
      contact: Joi.string().regex(/^[0-9()+]/).required().messages({
          "string.base": `"Mobile number:Invalid data."`,
          "string.email": `Enter valid Mobile number`,
          "any.required": `"Mobile number" is a required field`,
      }),
      companyname: Joi.string().regex(compRegex).required().messages({
        "string.base": `"Company:Invalid data."`,
        "string.pattern.base": `Enter company name`,
        "any.required": `"Company name" is a required field`,
      }),
      designation: Joi.string().regex(/^[-\w/\\/()+,\s+]+$/).required().messages({
        "string.base": `"designation:Invalid data."`,
        "string.pattern.base": `Enter proper designation`,
        "any.required": `"designation" is a required field`,
      }),
      country: Joi.string().regex(/^[-\w/\\/()+,\s+]+$/).required().messages({
        "string.base": `"Country:Invalid data."`,
        "string.pattern.base": `Select proper country`,
        "any.required": `"Country" is a required field`,
      }),
      product: Joi.string().regex(/^[-\w/\\/()+,\s+]+$/).messages({
        "string.base": `"Product:Invalid data."`,
        "string.pattern.base": `Select listed products`,
        "any.required": `"Product" is a required field`,
      }),
      url: Joi.string().uri().messages({
        "string.base": `"URL:Invalid data."`,
        "string.uri": `Enter valid url`,
        "any.required": `"url" is a required field`,
      }),
    });
    try {
      log.info("Payload validation check");
      await schema.validateAsync(req.body);
      log.info("Payload validation successfull");
      const awsMarketPlaceData = mongooseschema.awsMarketPlace({
        name: req.body.name,
        email: req.body.email,
        contact: req.body.contact,
        companyName: req.body.companyname,
        designation: req.body.designation,
        country: req.body.country,
        product: req.body.product,
        url: req.body.url,
      });
      try {
        awsMarketPlaceData.save();
        log.info("AWS Marketplace Data inserted to DB");
        let jdata = {
          business: "M2PSITE",
          transactionType: "m2p_site_mail_notify",
          emailNotifyData: {
            to_email: "rajeshk@m2pfintech.com",
            title: "Hi",
            body: `<div style="margin:auto; height: fit-content;">
                  <div style=" width: 580px; margin: auto; background-color:#FFFFFF; padding-top: 30px;">
                      <div style="text-align: center;"> <img src="https://m2p-website-static-files.s3.ap-south-1.amazonaws.com/images/m2p-logo.png" alt="" style="width: 70px; height: 70px;" >
                      </div>
                      <p style="text-align: center; font-size: 18px; line-height: 22px;">AWS Marketplace Form Submission</p>
                      <table class="table" style=" padding: 20px; font-size: 14px; line-height: 17px; margin: auto;" >

                          <tr>
                              <td style="padding: 15px 60px 15px 70px; border-bottom: #F3F3F3 1px solid; text-align: left; width: 43%;">Name</td>
                              <td style="padding: 15px 10px 15px 30px; border-bottom: #F3F3F3 1px solid; ">${req.body.name}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Email</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.email}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Mobile Number</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.contact}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Company name</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.companyname}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Designation</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.designation}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Country</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.country}</td>
                          </tr>
                          <tr>
                              <td style="padding: 15px 60px 15px 70px;border-bottom: #F3F3F3 1px solid; text-align: left">Products</td>
                              <td style="padding: 15px 10px 15px 30px;border-bottom: #F3F3F3 1px solid">${req.body.product}</td>
                          </tr>
                      </table>
                  </div>
              </div>`,
          },
        };
        request(
          {
            url: constant.EMAIL_NOTIFY_PRODUCTION,
            method: "POST",
            headers: {
              "content-Type": "application/json",
            },
            body: JSON.stringify(jdata),
          },
          function (error, response, body) {
            if (error) {
              log.info(error);
              return res
                .status(response.statusCode)
                .end("something went wrong");
            } else {
              if (response.statusCode === 500) {
                log.error(error);
                return res.status(response.statusCode).end(error);
              } else if (response.statusCode === 200) {
                log.info("Email sent successfully to Ping");
                return res.status(200).end("Data success submitted");
              } else {
                log.error("Something went wrong at Ping Mail");
                return res
                  .status(response.statusCode)
                  .end("Something went wrong at Ping Mail");
              }
            }
          }
        );
      } catch (err) {
        log.error("Something went wrong in GFF API");
        log.error(err);
        return res.status(500).end("Something went wrong in GFF API");
      }
    } catch (err) {
      if (err.details[0].message) {
        log.error(`Payload validation Error: ${err.details[0].message}`);
        return res.status(400).send({
          Error: {
            title: "Bad request",
            message: err.details[0].message,
          },
        });
      } else {
        log.error("Something went wrong in GFF API");
        log.error(err);
        return res.status(500).send("Something went wrong in GFF API");
      }
    }
  });
  app.post("/aws-marketplace/getData", verifyAccess, async (req, res) => {
    log.info("AWS Marketplace get data hit Received");
    const data = mongooseschema.awsMarketPlace;
    try {
      const result = await data.find().sort({ createdAt: -1 });
      log.info("Data Getting Success from GFF");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting GFF data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting GFF data");
    }
  });
  app.post("/aws-marketplace/filterbyDate", verifyAccess, async (req, res) => {
    log.info("Get filterbyDate for AWS Marketplace hit Received");
    const data = mongooseschema.awsMarketPlace;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    try {
      const result = await data
        .find({
          createdAt: {
            $gte: new Date(startDate).setHours(00, 00, 00),
            $lt: new Date(endDate).setHours(23, 59, 59),
          },
        })
        .sort({ createdAt: -1 });
      log.info("Data filter Success from AWS Marketplace");
      return res.status(200).json(result);
    } catch (err) {
      log.error("Something went wrong in getting GFF filter data");
      log.error(err);
      return res
        .status(500)
        .end("Something went wrong in getting GFF filter data");
    }
  });
};
