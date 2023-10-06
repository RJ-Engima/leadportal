var jwt = require('jsonwebtoken')
var session = require("express-session")

module.exports = async (req, res, next) => {
    if (req.headers.authorization != null || req.headers.authorization != undefined) {
        const authHeader = req.headers.authorization.split(" ")[1]
        if (authHeader) {
            await jwt.verify(authHeader, "myAccessSecretKey", (err, user) => {
                if (err) {
                    return res.status(403).send("Session Expired");
                }
                req.user = user;
                req.cookies.userlist = req.user.emailAddress
                next();
            });
        } else {
            return res.status(403).send("You are not authenticated!");
        }
    } else {
        return res.status(401).send('UnAuthorized!')

    }

};