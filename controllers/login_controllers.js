const json = require('express');
var db = require('../helpers/db_helpers');
var helper = require('./../helpers/helpers');
var multiparty = require('multiparty');
const moment = require('moment-timezone');
var imageServerPath = "./public/img/"
//app.use(express.json());

const msg_success = "successful";
const msg_fail = "fail";
const msg_invalidUserPassword = "invalid username and password";

module.exports.controllers = (app, io, user_socket_connect_list) => {

    const msg_exist_email = " username and password already exist"

    app.post('/api/login', (req, res) => {
        console.log(req.body);
        var reqObj = req.body;

        helper.checkParameterValid(res, reqObj, ["email", "password", "push_token"], () => {
            // Check if the user exists with email and password
            getUserWithPasswordData(reqObj.email, reqObj.password, (status, result) => {
                if (status) {
                    // User exists, generate auth_token
                    var auth_token = helper.createRequstToken();

                    db.query(
                        `UPDATE 
                            user_detail
                        SET 
                            auth_token = ?, 
                            push_token = ?, 
                            created_date = NOW() - INTERVAL 11 DAY
                        WHERE 
                            user_id = ? AND 
                            status = ?`,
                        [auth_token, reqObj.push_token, result.user_id, "1"], (err, uresult) => {

                            if (err) {
                                res.json({ status: "0", message:  msg_exist_email });
                                return;
                            } 

                            if (uresult.affectedRows > 0) {
                                // Fetch updated user data after token update
                                getUserData(result.user_id, (fetchStatus, fetchResult) => {
                                    if (fetchStatus) {
                                        fetchResult.auth_token = auth_token;
                                        res.json({ status: "1", payload: fetchResult, message: msg_success });
                                    } else {
                                        res.json({ status: "0", message: msg_fail });
                                    }
                                });
                            } else {
                                res.json({ status: "0", message: msg_invalidUserPassword });
                            }
                        });

                } else {
                    // If user does not exist, register the new user
                    registerUser(
                        reqObj.name,
                        reqObj.email,
                        reqObj.password,
                        reqObj.mobile,
                        reqObj.address,
                        reqObj.image,
                        reqObj.device_type, (registerStatus, registerResponse) => {
                            if (registerStatus) {
                                var auth_token = helper.createRequstToken();

                                db.query(
                                    `UPDATE 
                                    user_detail
                                SET 
                                    auth_token = ?, 
                                    push_token = ?, 
                                    created_date = NOW() - INTERVAL 11 DAY
                                WHERE 
                                    user_id = ? AND 
                                    status = ?`,
                                    [auth_token, reqObj.push_token, registerResponse.user_id, "1"], (err, uresult) => {

                                        if (err) {
                                            helper.throwHtmlError(err, res);
                                            return;
                                        }

                                        if (uresult.affectedRows > 0) {
                                            // Fetch updated user data after registration and token update
                                            getUserData(registerResponse.user_id, (fetchStatus, fetchResult) => {
                                                if (fetchStatus && fetchResult) {
                                                    fetchResult.auth_token = auth_token;
                                                    res.json({ status: "1", payload: fetchResult, message: msg_success });
                                                } else {
                                                    res.json({ status: "0", message: msg_fail });
                                                }
                                            });
                                        } else {
                                            res.json({ status: "0", message: msg_invalidUserPassword });
                                        }
                                    });

                            } else {
                                res.json(registerResponse); // Return the registration error response
                            }
                        });
                }
            });
        });
    });

    app.post('/api/sign_up', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        helper.checkParameterValid(res, reqObj,
            ["name", "mobile", "email", "address", "password", "push_token", "device_type"], () => {
                db.query("SELECT `user_id`, `email` FROM `user_detail` WHERE `email` = ?",
                    [reqObj.email], (err, result) => {
                        if (err) {
                            helper.throwHtmlError(err, res);
                            return;
                        }
                        if (result.length === 0) {
                            // no email found
                            var authToken = helper.createRequstToken();
                            var restCode = helper.createNumber()

                            db.query(
                                `INSERT INTO user_detail 
                        (name, email, password, mobile, address, device_type, 
                        auth_token, push_token, restCode, created_date, update_date) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?,?, NOW(), NOW())`,

                                [reqObj.name, reqObj.email, reqObj.password, reqObj.mobile,
                                reqObj.address, reqObj.device_type, authToken,
                                reqObj.push_token, restCode], (err, iResult) => {
                                    if (err) {
                                        helper.throwHtmlError(err, res);
                                        return;
                                    }
                                    if (iResult && iResult.insertId) {
                                        getUserData(iResult.insertId, (status, userObj) => {
                                            res.json({ status: "1", payload: userObj, message: msg_success })
                                        });

                                    } else {
                                        res.json({ status: "0", message: msg_fail })
                                    }
                                });
                        } else {
                            res.json({ status: "0", message: msg_exist_email })
                        }
                    });
            });
    });
};

// Add registerUser definition
function registerUser(name, email, password, mobile, address, image, device_type, callback) {
    db.query('SELECT * FROM user_detail WHERE email = ?', [email], (err, result) => {
        if (err) {
            return callback(false, { status: '0', message: 'Database error' });
        }

        if (result.length === 0) {
            const insertQuery = `
            INSERT INTO user_detail (name, email, password, mobile, address, image, device_type, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

            db.query(insertQuery, [name, email, password, mobile, address, image, device_type, "1"], (err, result) => {
                if (err) {
                    return callback(false, { status: '0', message: 'Database error' });
                }
                return callback(true, {
                    status: '1',
                    message: 'User successfully registered',
                    user_id: result.insertId
                });
            });
        } else {
            callback(false, { status: "0", message: msg_exist_email });
        }
    });
}

function getUserData(user_id, callback) {
    db.query(
        `SELECT 
            user_id, 
            name, 
            email, 
            password, 
            mobile, 
            address, 
            image, 
            device_type, 
            auth_token, 
            push_token, 
            created_date, 
            update_date, 
            status
        FROM 
            user_detail
        WHERE 
            user_id = ? AND status = ?`, [user_id, "1"], (err, result) => {
        if (err) {
            return callback(false, null);
        }
        if (result.length > 0) {
            return callback(true, result[0]);
        } else {
            return callback(false, null);
        }
    });
}

function getUserWithPasswordData(email, password, callback) {
    db.query(
        `SELECT 
            user_id, 
            name, 
            email, 
            password, 
            mobile, 
            address, 
            image, 
            device_type, 
            auth_token, 
            push_token, 
            created_date, 
            update_date, 
            status
        FROM 
            user_detail
        WHERE 
            email = ? AND password = ? AND status = ?`,
        [email, password, "1"], (err, result) => {
            if (err) {
                return callback(false, null);
            }
            if (result.length > 0) {
                return callback(true, result[0]);
            } else {
                return callback(false, null);
            }
        });
}
