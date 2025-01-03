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
                                            res.json({ "status": "1", "message": messages.addRestaurant });
                                        } else {
                                            res.json({ "status": "0", "message": messages.fail });
                                        }
                                    });

                                }
                            })

                        })
                    })

            })
        }, "1")

    })
    // update detail end point 
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
                        [reqObj.name[0], reqObj.shop_type[0],
                        reqObj.food_type[0], reqObj.address[0], reqObj.city[0],
                        reqObj.state[0], reqObj.latitude[0], reqObj.longitude[0],
                        reqObj.delivery_cost[0], reqObj.created_date, reqObj.restaurant_id, "1"],
                        (err, uresult) => {
                            if (err) {
                                // Log and handle database errors
                                helper.throwHtmlError(err, res);
                                return;
                            }

                            if (uresult.affectedRows > 0) {
                                // Successfully updated reset_code
                                res.json({ status: "1", message: messages.updateRestaurant });
                            } else {
                                // Failed to update reset_code, possibly due to an invalid status
                                res.json({ status: "0", message: messages.fail });
                            }
                        }
                    );

                });
        }, "1");
    });
    // update image end point
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
                                            res.json({ "status": "1", "message": messages.success });
                                        } else {
                                            res.json({ "status": "0", "message": messages.fail });
                                        }
                                    });

                            }
                        })

                    })
                })

            })
        }, "1")

    })

    //List All or One by id 
    app.post('/api/admin/restaurant_list', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            // Check if 'restaurant_id' is provided
            const query = reqObj.restaurant_id
                //check all 
                ? `SELECT restaurant_id, name, image, shop_type, food_type, address,
                   city, state, latitude, longitude, delivery_cost, updated_date, status 
                   FROM restaurants WHERE restaurant_id = ? AND status = ?`
                // check by id
                : `SELECT restaurant_id, name, image, shop_type, food_type, address,
                   city, state, latitude, longitude, delivery_cost, updated_date, status 
                   FROM restaurants WHERE status = ?`;

            // Parameters for the query
            const params = reqObj.restaurant_id
                ? [reqObj.restaurant_id, "1"]
                : ["1"];

            db.query(query, params, (err, result) => {
                if (err) {
                    // Log and handle database errors
                    helper.throwHtmlError(err, res);
                    return;
                }

                res.json({ status: "1", payload: result.replace_null(), message: messages.success });
            });
        }, "1");
    });

    app.post('/api/admin/restaurant_delete', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["restaurant_id"], () => {

                // Query to fetch the image file path
                db.query(
                    `SELECT image FROM restaurants WHERE restaurant_id = ? AND status = ?`,
                    [reqObj.restaurant_id, "1"],
                    (err, result) => {
                        if (err) {
                            helper.throwHtmlError(err, res);
                            return;
                        }

                        if (result.length > 0) {
                            const imagePath = imageServerPath + result[0].image;

                            // Delete the image file
                            fs.unlink(imagePath, (err) => {
                                if (err) {
                                    helper.throwHtmlError(err);
                                }

                                // Update the restaurant status in the database
                                db.query(
                                    `UPDATE restaurants SET status = ?, updated_date = NOW() 
                                    WHERE restaurant_id = ? AND status = ?`,
                                    ["2", reqObj.restaurant_id, "1"],
                                    (err, uresult) => {
                                        if (err) {
                                            helper.throwHtmlError(err, res);
                                            return;
                                        }

                                        if (uresult.affectedRows > 0) {
                                            res.json({ status: "1", message: messages.deleteRestaurant });
                                        } else {
                                            res.json({ status: "0", message: messages.fail });
                                        }
                                    }
                                );
                            });
                        } else {
                            res.json({ status: "0", message: messages.notFound });
                        }
                    }
                );
            });
        }, "1");
    });

    app.post('/api/admin/restaurant_offer_add', (req, res) => {
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

                helper.checkParameterValid(res, reqObj, ["name", "restaurant_id", "start_date", "end_time"], () => {

                    helper.checkParameterValid(res, files, ["image"], () => {
                        var extension = files.image[0].originalFilename.substring(files.image[0].originalFilename.lastIndexOf(".") + 1)
                        var imageFileName = "offer/" + helper.fileNameGenerate(extension);

                        var newPath = imageServerPath + imageFileName;

                        fs.rename(files.image[0].path, newPath, (err) => {
                            if (err) {
                                helper.throwHtmlError(err, res);
                                return;
                            } else {
                                db.query(`INSERT INTO offer_details(name, image, restaurant_id, start_date, end_time, created_date, updated_date, status) 
                                    VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?)`, [
                                    reqObj.name[0], imageFileName, reqObj.restaurant_id[0],
                                    reqObj.start_date[0], reqObj.end_time[0], "1"
                                ], (err, result) => {
                                    if (err) {
                                        helper.throwHtmlError(err, res);
                                        return;
                                    }
                                    if (result) {
                                        res.json({ "status": "1", "message": messages.addRestaurantOffer });
                                    } else {
                                        res.json({ "status": "0", "message": messages.fail });
                                    }
                                });


                            }
                        })

                    })
                })

            })
        }, "1")

    })

    app.post('/api/admin/restaurant_offer_update', (req, res) => {
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

                helper.checkParameterValid(res, reqObj, ["offer_id", "name", "restaurant_id", "start_date", "end_date"], () => {

                    var condition = "";
                    var imageFileName = "";
                    if (files.image && files.image[0]) {
                        var extension = files.image[0].originalFilename.substring(files.image[0].originalFilename.lastIndexOf(".") + 1)
                        imageFileName = "offer/" + helper.fileNameGenerate(extension);
                        var newPath = imageServerPath + imageFileName;

                        condition = ", image = '" + imageFileName + "'";
                        fs.rename(files.image[0].path, newPath, (err) => {
                            if (err) {
                                helper.throwHtmlError(err);
                                return;
                            }
                        })

                    }

                    db.query(
                        `UPDATE offer_details 
                         SET name = ?, start_date = ?, end_time = ?, updated_date = NOW(), status = 1 ${condition} 
                         WHERE restaurant_id = ? AND status < ? AND offer_id = ?`,
                        [
                            reqObj.name[0], reqObj.start_date[0], reqObj.end_date[0], reqObj.restaurant_id[0], "2", reqObj.offer_id[0]
                        ],
                        (err, result) => {
                            if (err) {
                                helper.throwHtmlError(err, res);
                                return;
                            }
                            if (result.affectedRows > 0) {
                                res.json({ "status": "1", "message": messages.updateRestaurantOffer });
                            } else {
                                res.json({ "status": "0", "message": messages.fail });
                            }
                        }
                    );
                })

            })
        }, "1")
    })

    app.post('/api/admin/restaurant_offer_delete', (req, res) => {
        helper.dlog(req.body);
        const reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["offer_id"], () => {

                console.log('Offer ID:', reqObj.offer_id);
                const offerId = parseInt(reqObj.offer_id); // Ensure correct data type

                db.query(`
                    UPDATE offer_details 
                    SET status = 2
                    WHERE offer_id = ?`,
                    [offerId], (err, uresult) => {
                        if (err) {
                            helper.throwHtmlError(err, res);
                            return;
                        }

                        if (uresult.affectedRows > 0) {
                            res.json({ status: "1", message: messages.deleteRestaurantOffer });
                        } else {
                            res.json({ status: "0", message: messages.notFound });
                        }
                    }
                );

            });
        }, "1");
    });

    app.post('/api/admin/restaurant_offer_active_inactive', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["offer_id", "is_active"], () => {

                var restCode = helper.createNumber();
                db.query(`
                    UPDATE offer_details 
                    SET status = ?, updated_date = NOW() 
                    WHERE offer_id = ? AND (status = '1' OR status = '0')`,
                    [reqObj.is_active, reqObj.offer_id, "1"], (err, uresult) => {
                        if (err) {
                            // Log and handle database errors
                            helper.throwHtmlError(err, res);
                            return;
                        }

                        if (uresult.affectedRows > 0) {
                            // Successfully updated reset_code
                            res.json({ status: "1", message: messages.success });
                        } else {

                            res.json({ status: "0", message: messages.fail });
                        }
                    }
                );

            });
        }, "1");
    });

    app.post('/api/admin/restaurant_offer_list', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["offer_id"], () => {

                db.query(`
                    SELECT offer_id, name, restaurant_id, image, start_date, end_time,status, created_date, updated_date, status FROM 
                offer_details WHERE status = ? `,
                    ["1"], (err, result) => {
                        if (err) {
                            // Log and handle database errors
                            helper.throwHtmlError(err, res);
                            return;
                        }
                        res.json({ status: "1", payload: result.replace_null(), message: messages.success });

                    }
                );

            });
        }, "1");
    });

    app.post('/api/admin/about_add', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["details", "display_order"], () => {

                db.query(`
                    INSERT INTO about_detail (details, display_order, created_date, updated_date) VALUE (?,?,NOW(), NOW())` ,
                    [reqObj.details, reqObj.display_order], (err, result) => {
                        if (err) {
                            // Log and handle database errors
                            helper.throwHtmlError(err, res);
                            return;
                        }
                        if (result.affectedRows > 0) {
                            res.json({ status: "1", message: messages.added });
                        } else {
                            res.json({ status: "0", message: messages.fail });
                        }

                    }
                );

            });
        }, "1");
    });

    app.post('/api/admin/about_list', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {

            db.query(`
                    SELECT about_id, details FROM about_detail WHERE status = ? ORDER BY display_order ` ,
                ["1"], (err, result) => {
                    if (err) {
                        // Log and handle database errors
                        helper.throwHtmlError(err, res);
                        return;
                    }
                    res.json({ status: "1", payload: result.replace_null(), message: messages.success });

                }
            );

        }, "1");
    });

    app.post('/api/admin/about_update', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["about_id", "details", "display_order"], () => {

                db.query(
                    `
                    UPDATE about_detail 
                    SET details = ?, display_order = ?, updated_date = NOW() 
                    WHERE about_id = ? AND status = ?
                    `,
                    [reqObj.details, reqObj.display_order, reqObj.about_id, "1"],
                    (err, result) => {
                        if (err) {
                            // Log and handle database errors
                            helper.throwHtmlError(err, res);
                            return;
                        }
                        if (result.affectedRows > 0) {
                            res.json({ status: "1", message: messages.updated });
                        } else {
                            res.json({ status: "0", message: messages.ail });
                        }
                    }
                );

            });
        }, "1");
    });

    app.post('/api/admin/about_delete', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["about_id"], () => {

                db.query(`
                    UPDATE about_detail SET status = ?,  updated_date = NOW() 
                    WHERE about_id = ? AND status = ?` ,
                    ["2", reqObj.about_id, "1"], (err, result) => {
                        if (err) {
                            // Log and handle database errors
                            helper.throwHtmlError(err, res);
                            return;
                        }
                        if (result) {
                            res.json({ status: "1", message: messages.deleted });
                        } else {
                            res.json({ status: "0", message: messages.fail });
                        }
                    }
                );

            });
        }, "1");
    });

    app.post('/api/admin/category_add', (req, res) => {
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

                helper.checkParameterValid(res, reqObj, ["name"], () => {

                    helper.checkParameterValid(res, files, ["image"], () => {
                        var extension = files.image[0].originalFilename.substring(files.image[0].originalFilename.lastIndexOf(".") + 1)
                        var imageFileName = "category/" + helper.fileNameGenerate(extension);

                        var newPath = imageServerPath + imageFileName;

                        fs.rename(files.image[0].path, newPath, (err) => {
                            if (err) {
                                helper.throwHtmlError(err, res);
                                return;
                            } else {
                                db.query(`INSERT INTO category(name, image, created_date, updated_date, status) 
                                    VALUES (?, ?, NOW(), NOW(), ?)`, [
                                    reqObj.name[0], imageFileName, "1"
                                ], (err, result) => {
                                    if (err) {
                                        helper.throwHtmlError(err, res);
                                        return;
                                    }
                                    if (result) {
                                        res.json({ "status": "1", "message": messages.addCategory });
                                    } else {
                                        res.json({ "status": "0", "message": messages.fail });
                                    }
                                });


                            }
                        })

                    })
                })

            })
        }, "1")

    })

    app.post('/api/admin/category_update', (req, res) => {

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

                helper.checkParameterValid(res, reqObj, ["category_id", "name"], () => {

                    var condition = "";
                    var imageFileName = "";
                    if (files.image && files.image[0]) {
                        var extension = files.image[0].originalFilename.substring(files.image[0].originalFilename.lastIndexOf(".") + 1)
                        imageFileName = "category/" + helper.fileNameGenerate(extension);
                        var newPath = imageServerPath + imageFileName;

                        condition = ", image = '" + imageFileName + "'";
                        fs.rename(files.image[0].path, newPath, (err) => {
                            if (err) {
                                helper.throwHtmlError(err);
                                return;
                            }
                        })

                    }

                    db.query(
                        `UPDATE category
                         SET name = ?,updated_date = NOW() ${condition}
                         WHERE status < ? AND category_id = ?`,
                        [
                           reqObj.name[0],  "2", reqObj.category_id[0] 
                        ],
                        (err, result) => {
                            if (err) {
                                helper.throwHtmlError(err, res);
                                return;
                            }
                            if (result.affectedRows > 0) {
                                res.json({ "status": "1", "message": messages.updateCategory });
                            } else {
                                res.json({ "status": "0", "message": messages.fail });
                            }
                        }
                    );
                })

            })
        }, "1")
    })

    app.post('/api/admin/category_delete', (req, res) => {
        helper.dlog(req.body);
        const reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.checkParameterValid(res, reqObj, ["category_id"], () => {

                db.query(`
                    UPDATE category
                    SET status = ?, updated_date = NOW()
                    WHERE category_id = ? AND status != ?`,
                    ["2",reqObj.category_id[0], "2"], (err, uresult) => {
                        if (err) {
                            helper.throwHtmlError(err, res);
                            return;
                        }
                        if (uresult.affectedRows > 0) {
                            res.json({ status: "1", message: messages.deleteCategory });
                        } else {
                            res.json({ status: "0", message: messages.notFound });
                        }
                    }
                );

            });
        }, "1");
    });

    app.post('/api/admin/category_list', (req, res) => {
        helper.dlog(req.body);
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {

            db.query(`
                    SELECT category_id, name, image, created_date, updated_date, status FROM 
                category WHERE status = ? `,
                ["1"], (err, result) => {
                    if (err) {
                        // Log and handle database errors
                        helper.throwHtmlError(err, res);
                        return;
                    }
                    res.json({ status: "1", payload: result.replace_null(), message: messages.success });

                }
            );


        }, "1");
    });

}



