 var mysql = require('mysql2');
 var config = require('config');
// // const { options } = require('../routes');
 var dbConfig = config.get('dbconfig');
 var db = mysql.createConnection(dbConfig);
 var helper = require('./helpers');
// // const { query } = require('express');

//Optional Configuration Check
 if(config.has('optionalFeature.detial')) {
     var detail = config.get('optionalFeature');
     helper.dlog('config'+ detail);
 }
 reconnect(db, () =>{})

 function reconnect(connection, callback){
    helper.dlog("\n New connection tentative ... (" + helper.
        serverYYYYMMDDHHmmss() + ")")
    connection = mysql.createConnection(dbConfig);
    connection.connect((err) =>{
        //Handling Connection Errors
        if(err){
            helper.throwHtmlError(err);
            setTimeout(() =>{
                helper.dlog('---------------------08 ReConnecting Error('+ helper.
                    serverYYYYMMDDHHmmss() +')-------------');
                    reconnect(connection,callback);
            }, 1000);
        } else{
            helper.dlog('\n\t ------- New connection established with database. --------');
                db = connection;
                return callback();
        }
     })

    connection.on('error',(err) =>{
        helper.dlog('-------App is connection Crash 08 Helper ('+ helper.
                    serverYYYYMMDDHHmmss() +')----------');
       if(err.code === "PROTOCOL_CONNECTION_LOST"){
        helper.dlog
        ("/!\\ PROTOCOL_CONNECTION_LOST cannot establish connection with the database. /!\\(" + err.code +")");
        reconnect(db, callback)
       }else if(err.code === "PROTOCOL_ENQUEUE_AFTER_QUIT"){
        helper.dlog
        ("/!\\ PROTOCOL_ENQUEUE_AFTER_QUIT cannot establish a connection with the database. /!\\(" + err.code +")");
        reconnect(db, callback)
       } else if(err.code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR"){
        helper.dlog
        ("/!\\ PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR cannot establish a connection with the database. /!\\(" + err.code +")");
        reconnect(db, callback)
       } else if(err.code === "PROTOCOL_HANDSHAKE_TWICE"){
        helper.dlog
        ("/!\\ PROTOCOL_HANDSHAKE_TWICE cannot establish a connection with the database. /!\\(" + err.code +")");
        reconnect(db, callback)
       } else if(err.code === "ECONNREFUSED"){
        helper.dlog
        ("/!\\ ECONNREFUSED cannot establish a connection with the database. /!\\(" + err.code +")");
        reconnect(db, callback)
       } else if(err.code === "PROTOCOL_PACKETS_OUT_OF_ORDER"){
        helper.dlog
        ("/!\\ PROTOCOL_PACKETS_OUT_OF_ORDER cannot establish a connection with the database. /!\\(" + err.code +")");
        reconnect(db, callback)
       }else {
        throw err;
       }
       
     })

 }

 module.exports = {
     query: (sqlQuery, args, callback) =>{
         if(db.state ==='authenticated' || db.state === "connected"){
             db.query(sqlQuery, args, (error, result) =>{
                 return callback(error,result)
             }) 
         }else if(db.state === "protocol_error"){
             reconnect (db, () => {
                 db.query(sqlQuery, args, (error, result) =>{
                     return callback(error,result)
                 }) 
             })
         }else{
             reconnect (db, () => {
                 db.query(sqlQuery, args, (error, result) =>{
                     return callback(error,result)
                 }) 
             })
         }
     }
 }

 process.on('uncaughtException', (err) => {
     helper.dlog
     ('-------------------App is crash DB helper(" + helper.serverYYYYMMDDHHmmss() + ")-----------------');
     helper.dlog(err.code);
   // helper.throwHtmlError(err);
 })