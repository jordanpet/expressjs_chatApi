const json = require('express');
var db = require('../helpers/db_helpers');
var helper = require('./../helpers/helpers');
var multiparty = require('multiparty');
var fs = require('fs');
const moment = require('moment-timezone');
var imageServerPath = "./public/img/"
//app.use(express.json());

const msg_success = "successful";
const msg_fail = "fail";
const msg_invalidUserPassword = "invalid username and password";
const msg_exist_email = " username and password already exist";
const msg_not_exist = "username and password not exist";
const msg_update_password = "user password updated successfully";
const msg_add_Restaurant = "Restaurant added successfully";
const msg_update_Restaurant = "Restaurant updated successfully";


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

    // add Restaurant end point
    app.post('/api/admin/restaurant_add', (req, res) => {
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
                helper.checkParameterValid(res, reqObj, ["name", "shop_type", "food_type", "address",
                    "city", "state", "latitude", "longitude", "delivery_cost",], () => {
                        helper.checkParameterValid(res, files, ["image"], () => {

                            var extension = files.image[0].originalFilename.substring(files.image[0].originalFilename.lastIndexOf(".") + 1)
                            var imageFileName = "restaurant/" + helper.fileNameGenerate(extension);

                            var newPath = imageServerPath + imageFileName;

                            fs.rename(files.image[0].path, newPath, (err) => {
                                if (err) {
                                    helper.throwHtmlError(err, res);
                                    return;
                                } else {
                                    db.query(`INSERT INTO restaurants(name, image, shop_type, food_type, address, city, state, latitude, 
                                        longitude, delivery_cost, created_date, updated_date,status) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(),1)`, [
                                        reqObj.name[0], imageFileName, reqObj.shop_type[0],
                                        reqObj.food_type[0], reqObj.address[0], reqObj.city[0],
                                        reqObj.state[0], reqObj.latitude[0], reqObj.longitude[0],
                                        reqObj.delivery_cost[0]
                                    ], (err, result) => {
                                        if (err) {
                                            helper.throwHtmlError(err, res);
                                            return;
                                        }
                                        if (result) {
                                            res.json({ "status": "1", "message": msg_add_Restaurant });
                                        } else {
                                            res.json({ "status": "0", "message": msg_fail });
                                        }
                                    });

                                }
                            })

                        })
                    })

            })
        }, "1")

    })

    app.post('/api/admin/restaurant_update', (req, res) => {
        helper.dlog(req.body);  
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["restaurant_id", "name", "shop_type", "food_type", "address",
                "city", "state", "latitude", "longitude", "delivery_cost"], () => {

                    db.query(
                        `UPDATE restaurants SET name = ?, shop_type = ?,food_type = ?,
                        address = ?, city = ?,state = ?, latitude = ?,longitude = ?, delivery_cost = ?, created_date = ?, 
                        updated_date = NOW() WHERE restaurant_id = ? AND status = ?  `,
                        [reqObj.name[0],reqObj.shop_type[0],
                        reqObj.food_type[0], reqObj.address[0], reqObj.city[0],
                        reqObj.state[0], reqObj.latitude[0], reqObj.longitude[0],
                        reqObj.delivery_cost[0],  reqObj.created_date, reqObj.restaurant_id, "1"],
                        (err, uresult) => {
                            if (err) {
                                // Log and handle database errors
                                helper.throwHtmlError(err, res);
                                return;
                            }

                            if (uresult.affectedRows > 0) {
                                // Successfully updated reset_code
                                res.json({ status: "1", message: msg_update_Restaurant });
                            } else {
                                // Failed to update reset_code, possibly due to an invalid status
                                res.json({ status: "0", message: msg_fail });
                            }
                        }
                    );

                });
        }, "1");
    });

    app.post('/api/admin/restaurant_update_image', (req, res) => {
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

                helper.checkParameterValid(res, reqObj, ["restaurant_id"], () => {
                        helper.checkParameterValid(res, files, ["image"], () => {

                            var extension = files.image[0].originalFilename.substring(files.image[0].originalFilename.lastIndexOf(".") + 1)
                            var imageFileName = "restaurant/" + helper.fileNameGenerate(extension);

                            var newPath = imageServerPath + imageFileName;

                            fs.rename(files.image[0].path, newPath, (err) => {
                                if (err) {
                                    helper.throwHtmlError(err, res);
                                    return;
                                } else {
                                    db.query(`UPDATE restaurants SET image = ?, updated_date = NOW() 
                                        WHERE 
                                        restaurant_id = ? AND status = ?`, 
                                     [imageFileName, reqObj.restaurant_id[0], "1"], (err, result) => {
                                        if (err) {
                                            helper.throwHtmlError(err, res);
                                            return;
                                        }
                                        if (result) {
                                            res.json({ "status": "1", "message": msg_success });
                                        } else {
                                            res.json({ "status": "0", "message": msg_fail });
                                        }
                                    });

                                }
                            })

                        })
                    })

            })
        }, "1")

    })

}



