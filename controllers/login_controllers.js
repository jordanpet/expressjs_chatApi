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
const msg_exist_email = " username and password already exist"

module.exports.controllers = (app, io, user_socket_connect_list) => {

    app.post('/api/login', (req, res) => {
        console.log(req.body);
        const reqObj = req.body;

        helper.checkParameterValid(res, reqObj, ["email", "password", "push_token"], () => {
            getUserWithPasswordData(reqObj.email, reqObj.password, (status, result) => {
                if (status) {
                    // User exists, generate auth_token
                    const auth_token = helper.createRequstToken();

                    db.query(`
                        UPDATE user_detail
                         SET auth_token = ?, push_token = ?, created_date = NOW() - INTERVAL 11 DAY
                         WHERE user_id = ? AND status = ?`,
                        [auth_token, reqObj.push_token, result.user_id, "1"], (err, uresult) => {
                            if (err) {
                                res.json({ status: "0", message: "Database error" });
                                return;
                            }

                            if (uresult.affectedRows > 0) {
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
                    res.json({ status: "0", message: msg_invalidUserPassword });
                }
            });
        });
    });

    app.post('/api/sign_up', (req, res) => {
        console.log('Received request:', req.body); // Log request for debugging
        const reqObj = req.body;
    
        // Validate request parameters
        helper.checkParameterValid(res, reqObj,
            ["name", "mobile", "email", "address", "password", "push_token", "device_type"], () => {
    
                // Check if email already exists
                db.query("SELECT user_id, email FROM user_detail WHERE email = ?",
                    [reqObj.email], (err, result) => {
                        if (err) {
                            console.error('Database error on SELECT:', err); // Log error for debugging
                            res.status(500).json({ status: "0", message: "Database error" });
                            return;
                        }
    
                        if (result.length === 0) {
                            // Email not found, proceed with registration
                            const authToken = helper.createRequstToken();
                            const restCode = helper.createNumber();
    
                            db.query(`
                                INSERT INTO user_detail 
                                (name, email, password, mobile, address, device_type, 
                                auth_token, push_token, restCode, created_date, update_date) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                                [reqObj.name, reqObj.email, reqObj.password, reqObj.mobile,
                                reqObj.address, reqObj.device_type, authToken,
                                reqObj.push_token, restCode], (err, iResult) => {
    
                                if (err) {
                                    console.error('Database error on INSERT:', err); // Log error for debugging
                                    res.status(500).json({ status: "0", message: "Database error" });
                                    return;
                                }
    
                                if (iResult && iResult.insertId) {
                                    // Fetch user data for response
                                    getUserData(iResult.insertId, (status, userObj) => {
                                        if (status) {
                                            res.json({ status: "1", payload: userObj, message: msg_success });
                                        } else {
                                            console.error('Error fetching user data'); // Log error for debugging
                                            res.status(500).json({ status: "0", message: msg_fail });
                                        }
                                    });
                                } else {
                                    res.status(400).json({ status: "0", message: msg_fail });
                                }
                            });
                        } else {
                            res.status(409).json({ status: "0", message: msg_exist_email });
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

        if (result.length > 0) {
            // If email exists, return error message
            return callback(false, { status: '0', message: msg_exist_email });
        }

        // Proceed with registration
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
    });
}


function getUserData(user_id, callback) {
    db.query(`
        SELECT 
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
    db.query(`
        SELECT 
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