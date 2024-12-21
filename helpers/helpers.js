// // // const { name } = require('ejs');
 var moment = require('moment-timezone');
// // // const { format } = require('morgan');
 const fs = require('fs');

 const app_debug_mode = true;
 const timezone_name = "Africa/Lagos";
 const msg_server_internal_error = "server internal Error"

 module.exports = {
     throwHtmlError: (err, res) => {
        if (!err) {
            dlog("Error object is null or undefined.");
            if (res) {
                res.json({ status: "0", message: msg_server_internal_error });
            }
            return;
        }

         dlog("-------------------------App is Helpers Throw  crash(" + serverYYYYMMDDHHmmss()
             + ")---------------")
         dlog(err.stack);

         fs.appendFile('./crash_log/Crash' + serverDateTime('YYYY-MM-DD HH mm ss ms')
             + '.txt', err.stack, (err) => {
                 if (err) {
                    dlog(err);
                 }
             });
         if (res) {
             res.json({ 'status': '0', 'message': msg_server_internal_error })
             return
         }

           },
     throwSocketError: (err, client, eventName) => {
         dlog("-------------------------App is Helpers Throw throw crash(" + serverYYYYMMDDHHmmss()
             + ")---------------")
         dlog(err.stack);

         fs.appendFile('./crash_log/Crash' + serverDateTime('YYYY-MM-DD HH mm ss ms')
             + '.txt', err.stack, (err) => {
                 if (err) {
                     dlog(err);
                 }
             })
         if (client) {
             client.emit(eventName, { 'status': '0', 'message': msg_server_internal_error })
             return
         }
    },

     checkParameterValid: (res, jsonObj, checkKey, callback) => {
         var isValid = true;
         var missingParameter = "";

        checkKey.forEach((key, indexOf) => {
            if (!Object.prototype.hasOwnProperty.call(jsonObj, key)) {
                 isValid = false;
                 missingParameter += key + " ";
             }
         });

         if (!isValid) {

            // if (!app_debug_mode) {
            //      missingParameter = "";
             //}
             res.json({ 'status': '0', 'message': "Missing parameter(" + missingParameter + ")" })
         } else {
             return callback()
         }
     },


     checkParameterValidSocket: (client, eventName, jsonObj, checkKey, callback) => {
         var isValid = true;
         var missingParameter = "";

         checkKey.forEach((key, indexOf) => {
             if (!Object.prototype.hasOwnProperty.call(jsonObj, key)) {
                 isValid = false;
                 missingParameter += +'';
             }
         });

        if (isValid) {
            if (!app_debug_mode) {
                missingParameter = "";
                client.emit(eventName, {
                    'status': '0', 'message':
                        "Missing parameter(" + missingParameter + ")"
                })
            } else {
                return callback()
            }
        }
     },
     createRequstToken: () => {
         var chars = "123456789abcdefghijkmnopqrstwvxyzABCDEFGHIJKMNOPQISTWVXYZ"
         var result = "";
         for (let i = 0; i < 20; i++) {
             result += chars.charAt(Math.floor(Math.random() * chars.length));
         }
         return result;
     },

     createNumber: (length = 6) => {
        var chars = "123456789"
        var result = "";
        for (let i = length; i < 20; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

     dlog: (log) => {
         return dlog(log);
     },
     serverDateTime: (format) => {
         return serverDateTime(format);
     },
     serverYYYYMMDDHHmmss: () => {
        return serverYYYYMMDDHHmmss();
    }

 }
 function serverDateTime(format) {
     var jan = moment(new Date());
     jan.tz(timezone_name).format();
    return jan.format(format);
 }
 function dlog(log) {
     if (app_debug_mode) {
         console.log(log);
     }
 }

 function serverYYYYMMDDHHmmss() {
     return serverDateTime('YYYY-MM-DD HH:mm:ss')
 }

 process.on('uncaughtException', (err) => {
    dlog(`Uncaught exception: ${err.stack}`)
//          helpers.logError(`Uncaught exception: ${err.stack}`);
 });
