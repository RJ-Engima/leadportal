var express = require("express");
var router = express.Router();
const log = require("./config/log");

// const verifyAccess = (req, res, next) => {
//     const authHeader = req.body.headers.Authorization.split(" ")[1]
//     let accessDecrypt = CryptoJS.AES.decrypt(authHeader, "accessEncryptKey").toString(CryptoJS.enc.Utf8)
//     if (accessDecrypt) {
//         const token = accessDecrypt;
//         jwt.verify(token, "myAccessSecretKey", (err, user) => {
//             if (err) {
//                 return res.status(403).json("Session Expired");
//             }
//             req.user = user;
//             next();
//         });
//     } else {
//         res.status(401).json("You are not authenticated!");
//     }
// };
const sessionJwtAuthCheck = (req, res, next) => {
  var pathIgnore = ["/", "/login"];
  if (pathIgnore.includes(req.path)) {
    req.session.destroy();
    next();
  } else {
    if (req.session.authtoken === undefined) {
      res.redirect("/login");
    } else {
      next();
    }
  }
};
router.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/");
});
router.get("/", (req, res) => {
  res.redirect("/login");
});
router.get("/login", (req, res) => {
  log.info("Base URL :: " + req.headers.referrerBaseUrl);
  res.render("login", {
    title: "Login Page",
    style: "style.css",
    csrfToken: req.csrfToken(),
  });
});
router.get("/contact", sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("contact", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/")
  }
});
router.get("/footerContact", sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("footerContact", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/")
  }
});

router.get("/subscription",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("subscription", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/")
  }
});

// router.get("/subscriber",sessionJwtAuthCheck, (req, res) => {
//   res.render("subscriber", {
//     title: "Lead Dashboard",
//     style: "style.css",
//     csrfToken: req.csrfToken(),
//   });
// });

// router.get("/tether",sessionJwtAuthCheck, (req, res) => {
//   res.render("subscription", {
//     title: "Lead Dashboard",
//     style: "style.css",
//     csrfToken: req.csrfToken(),
//   });
// });

// router.get("/digibank",sessionJwtAuthCheck, (req, res) => {
//   res.render("subscription", {
//     title: "Lead Dashboard",
//     style: "style.css",
//     csrfToken: req.csrfToken(),
//   });
// });

// router.get("/landing",sessionJwtAuthCheck, (req, res) => {
//   res.render("landing", {
//     title: "Lead Dashboard",
//     style: "style.css",
//     csrfToken: req.csrfToken(),
//   });
// });
router.get("/livquik-contact",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "LEAD_LIVQUIK_MAKER"){
    res.render("livquik-contact", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect('/')
  }
});
router.get("/livquik-careers",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "LEAD_LIVQUIK_MAKER"){
    res.render("livquik-careers", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect('/')
  }
});
router.get("/livquik-quikwallet",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "LEAD_LIVQUIK_MAKER"){
    res.render("livquik-quikwallet", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect('/')
  }
});
router.get("/seamless",sessionJwtAuthCheck, (req, res) => {
  res.render("seamless", {
    title: "Lead Dashboard",
    style: "style.css",
    csrfToken: req.csrfToken(),
  });
});

router.get("/paylater",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "LEAD_PAYLATER_MAKER"){
    res.render("paylater", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/");
  }
});
router.get("/resources",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("resources", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/")
  }
});
router.get("/microfinance",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("mfi", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/");
  }
});
router.get("/global-fintech",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("gff", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/");
  }
});
router.get("/singapore-fintech",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("sff", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/");
  }
});
router.get("/join-the-fun",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("join-the-fun", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/");
  }
});
router.get("/aws-marketplace",sessionJwtAuthCheck, (req, res) => {
  if(req.session.role === "ROLE_CHECKER"){
    res.render("aws-marketplace", {
      title: "Lead Dashboard",
      style: "style.css",
      csrfToken: req.csrfToken(),
    });
  }else{
    res.redirect("/");
  }
});



router.get("/403", (req, res) => {
  res.render("template/403", {
    layout: false,
  });
});

router.get("/404", (req, res) => {
  res.render("template/404", {
    layout: false,
  });
});
router.get("/401", (req, res) => {
  res.render("template/401", {
    layout: false,
  });
});

module.exports = router;
