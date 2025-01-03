const json = require('express');
var db = require('../helpers/db_helpers');
var helper = require('./../helpers/helpers');
var multiparty = require('multiparty');
var fs = require('fs');
const moment = require('moment-timezone');
var imageServerPath = "./public/img/"
//app.use(express.json());
var messages = require('/Users/mac/my-express-app/utils/messages.js');

//HELPER FUNCTIONS
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
            user_type,
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


function saveImage(imageFile, savePath) {
    fs.rename(imageFile.path, savePath, (err) => {
        if (err) {
            helper.throwHtmlError(err);
            return;
        }
    })
}

function checkAccessToken(headerObj, res, callback, require_type = "") {
    helper.dlog(headerObj.access_token);
    helper.checkParameterValid(res, headerObj, ["access_token"], () => {
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
                user_type,
                status
            FROM 
                user_detail
            WHERE 
                auth_token = ? AND status = ?`, [headerObj.access_token, "1"], (err, result) => {
            if (err) {
                helper.throwHtmlError(err, res);
                return;
            }
            helper.dlog(result);
            if (result.length > 0) {
                if (require_type !== "") {
                    if (result[0].user_type == require_type) {
                        return callback(result[0]);
                    } else { res.json({ "status": "0", "code": "404", "message": "Access denied. Unathorize user access" }) }
                } else {
                    return callback(result[0]);
                }
            } else {
                res.json({ "status": "0", "code": "404", "message": "Access denied. Unathorize user access" })
            }
        }
        )
    })
}


//END-POINT
module.exports.controllers = (app, io, user_socket_connect_list) => {

    //SIGN-UP
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
                            helper.throwHtmlError(err, res);
                            return;
                        }

                        if (result.length === 0) {
                            // Email not found, proceed with registration
                            var authToken = helper.createRequstToken();
                            var restCode = helper.createNumber();

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
                                                res.json({ status: "1", payload: userObj, message: messages.success });
                                            } else {
                                                console.error('Error fetching user data'); // Log error for debugging
                                                res.status(500).json({ status: "0", message: messages.fail });
                                            }
                                        });
                                    } else {
                                        res.status(400).json({ status: "0", message: messages.fail });
                                    }
                                });
                        } else {
                            res.status(409).json({ status: "0", message: messages.existEmail });
                        }
                    });
            });
    });

    // LOGIN
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
                                        res.json({ status: "1", payload: fetchResult, message: messages.success });
                                    } else {
                                        res.json({ status: "0", message: messages.fail });
                                    }
                                });
                            } else {
                                res.json({ status: "0", message: messages.invalidUserPassword });
                            }
                        });
                } else {
                    res.json({ status: "0", message: messages.invalidUserPassword });
                }
            });
        });
    });
    //Forgot Password Request
    app.post('/api/forgot_password_request', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        // Validate the required parameter 'email'
        helper.checkParameterValid(res, reqObj, ["email"], () => {
            db.query("SELECT user_id, email FROM user_detail WHERE email = ?", [reqObj.email], (err, result) => {
                if (err) {
                    // Log and handle database errors
                    helper.throwHtmlError(err, res);
                    return;
                }

                if (result.length > 0) {
                    var restCode = helper.createNumber();
                    db.query(
                        `UPDATE user_detail SET restCode = ? WHERE email = ? AND status = ?`,
                        [restCode, reqObj.email, "1"],
                        (err, uresult) => {
                            if (err) {
                                // Log and handle database errors
                                helper.throwHtmlError(err, res);
                                return;
                            }

                            if (uresult.affectedRows > 0) {
                                // Successfully updated reset_code
                                res.json({ status: "1", message: messages.success });
                            } else {
                                // Failed to update reset_code, possibly due to an invalid status
                                res.json({ status: "0", message: messages.fail });
                            }
                        }
                    );
                } else {
                    // Email does not exist in the database
                    res.json({ status: "0", message: messages.existEmail });
                }
            });
        });
    });

    // Forgot Password Verify
    app.post('/api/forgot_password_verify', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        // Validate required parameters 'email' and 'restCode'
        helper.checkParameterValid(res, reqObj, ["email", "restCode"], () => {
            // Query the database for user details matching email and restCode
            db.query("SELECT user_id, email FROM user_detail WHERE email = ? AND restCode = ?",
                [reqObj.email, reqObj.restCode], (err, result) => {
                    if (err) {
                        // Log and handle database errors
                        helper.throwHtmlError(err, res);
                        return;
                    }

                    if (result.length > 0) {
                        // Generate a new reset code
                        var NewRestCode = helper.createNumber();

                        // Update the reset code in the database
                        db.query(
                            "UPDATE user_detail SET restCode = ? WHERE email = ? AND status = ?",
                            [NewRestCode, reqObj.email, "1"],
                            (err, uresult) => {
                                if (err) {
                                    // Log and handle database errors
                                    helper.throwHtmlError(err, res);
                                    return;
                                }
                                if (uresult.affectedRows > 0) {
                                    // Successfully updated reset_code
                                    res.json({
                                        status: "1",
                                        payload: {
                                            "user_id": result[0].user_id,
                                            "restCode": NewRestCode
                                        },
                                        message: messages.success
                                    });
                                } else {
                                    // Failed to update reset_code, possibly due to an invalid status
                                    res.json({ status: "0", message: messages.fail });
                                }
                            }
                        );
                    } else {
                        // Email or reset code does not exist in the database
                        res.json({ status: "0", message: messages.existEmail});
                    }
                });
        });
    });

    // Forgot Password Update
    app.post('/api/forgot_password_set_now', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        helper.checkParameterValid(res, reqObj, ["user_id", "restCode", "new_password"], () => {
            var NewRestCode = helper.createNumber();

            db.query("UPDATE user_detail SET password = ?, restCode = ? WHERE user_id = ? AND restCode = ? AND status = ? ",
                [reqObj.new_password, NewRestCode, reqObj.user_id, reqObj.restCode, "1"], (err, result) => {
                    if (err) {
                        // Log and handle database errors
                        helper.throwHtmlError(err, res);
                        return;
                    }
                    if (result.affectedRows > 0) {
                        res.json({ status: "1", message: messages.updatePassword });
                    }
                    else {
                        // Failed to update reset_code, possibly due to an invalid status
                        res.json({ status: "0", message: messages.fail });
                    }

                });
        });
    });

     app.post('/api/update_profile', (req, res) => {
            helper.dlog(req.body);
            var reqObj = req.body;
    
            checkAccessToken(req.headers, res, (userObj) => {
                helper.checkParameterValid(res, reqObj, ["name", "mobile",  "address"], () => {



                        db.query(
                            `UPDATE user_detail SET name = ?, mobile = ?,
                            address = ?, updated_date = NOW() WHERE user_id = ? AND status = ?  `,
                            [reqObj.name[0], reqObj.mobile[0],
                             reqObj.address[0], reqObj.city[0],
                            reqObj.state[0], reqObj.latitude[0], reqObj.longitude[0],
                            reqObj.delivery_cost[0], reqObj.created_date, reqObj.user_id, "1"],
                            (err, uresult) => {
                                if (err) {
                                    // Log and handle database errors
                                    helper.throwHtmlError(err, res);
                                    return;
                                }
    
                                if (uresult.affectedRows > 0) {
                                    // Successfully updated reset_code
                                    getUserData(userObj.user_id, (status, userObj) => {
                                        if (status) {
                                            res.json({ status: "1", payload: userObj, message: messages.success });
                                        } else {
                                            console.error('Error fetching user data'); // Log error for debugging
                                            res.status(500).json({ status: "0", message: messages.fail });
                                        }
                                    });
                                } else {
                                    // Failed to update reset_code, possibly due to an invalid status
                                    res.json({ status: "0", message: messages.fail });
                                }
                            }
                        );
    
                    });
            });
        });

    app.post('/api/upload_image', (req, res) => {
        var form = new multiparty.Form();
        form.parse(req, (err, reqObj, files) => {
            if (err) {
                helper.throwHtmlError(err, res);
                return;
            }
            helper.dlog("------------------Parameter--------------")
            helper.dlog(reqObj);
            helper.dlog("------------------Files--------------")
            helper.dlog(files);

            if (files.image != undefined || files.image != null) {
                var extension = files.image[0].originalFilename.substring(files.image[0].originalFilename.lastIndexOf(".") + 1)
                var imageFileName = helper.fileNameGenerate(extension);

                var newPath = imageServerPath + imageFileName;

                fs.rename(files.image[0].path, newPath, (err) => {
                    if (err) {
                        helper.throwHtmlError(err,);
                        return;
                    } else {

                        var name = reqObj.name;
                        var address = reqObj.address;

                        helper.dlog(name);
                        helper.dlog(address);

                        res.json({
                            status: "1", payload: { "name": name, "address": address, "image": helper.ImagePath() + imageFileName },
                            message: messages.success
                        });
                    }
                })
            }
        })
    })

    app.post('/api/upload_multiple_image', (req, res) => {
        var form = new multiparty.Form();

        form.parse(req, (err, reqObj, files) => {
            if (err) {
                helper.throwHtmlError(err, res);
                return;
            }
            helper.dlog("------------------Parameter--------------")
            helper.dlog(reqObj);
            helper.dlog("------------------Files--------------")
            helper.dlog(files);

            if (files.image != undefined || files.image != null) {

                var imageNamePathArr = [];
                var fullImageNamePathArr = [];

                var name = reqObj.name
                var address = reqObj.address

                helper.dlog(name);
                helper.dlog(address);

                files.image.forEach(imageFile => {
                    var extension = imageFile.originalFilename.substring(imageFile.originalFilename.lastIndexOf(".") + 1)
                    var imageFileName = helper.fileNameGenerate(extension);
                    imageNamePathArr.push(imageFileName);
                    fullImageNamePathArr.push(helper.ImagePath() + imageFileName)

                     saveImage(imageFile, imageServerPath + imageFileName);

                    helper.dlog(imageNamePathArr);
                    helper.dlog(fullImageNamePathArr);

                    
                })
                res.json({
                    status: "1", payload: { "name": name, "address": address, "image": fullImageNamePathArr },
                    message: messages.success
                });


            }
        })
    })

    app.post('/api/update_image', (req, res) => {
            helper.dlog(req.body);
            const reqObj = req.body;
    
            var form = new multiparty.Form();
            checkAccessToken(req.headers, res, (userObj) => {
                form.parse(req, (err, reqObj, files) => {
                    if (err) {
                        helper.throwHtmlError(err, res);
                        return;
                    }
                    helper.dlog("------------------Parameter--------------")
                    helper.dlog(reqObj);
                    helper.dlog("------------------Files--------------")
                    helper.dlog(files);
    
                    
                        helper.checkParameterValid(res, files, ["image"], () => {
    
                            var extension = files.image[0].originalFilename.substring(files.image[0].originalFilename.lastIndexOf(".") + 1)
                            var imageFileName = "user/" + helper.fileNameGenerate(extension);
    
                            var newPath = imageServerPath + imageFileName;
    
                            fs.rename(files.image[0].path, newPath, (err) => {
                                if (err) {
                                    helper.throwHtmlError(err, res);
                                    return;
                                } else {
                                    db.query(`UPDATE user_detail SET image = ?, updated_date = NOW() 
                                            WHERE 
                                            user_id = ? AND status = ?`,
                                        [imageFileName, reqObj.user_id[0], "1"], (err, result) => {
                                            if (err) {
                                                helper.throwHtmlError(err, res);
                                                return;
                                            }
                                            if (result) {
                                                getUserData(userObj.user_id, (status, userObj) => {
                                                    if (status) {
                                                        res.json({ status: "1", payload: userObj, message: messages.success });
                                                    } else {
                                                        console.error('Error fetching user data'); // Log error for debugging
                                                        res.status(500).json({ status: "0", message: messages.fail });
                                                    }
                                                });
                                            } else {
                                                res.json({ "status": "0", "message": messages.fail });
                                            }
                                        });
    
                                }
                            })
    
                        })
                    
    
                })
            })
    
        })
    
}

