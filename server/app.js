const app = require('express')();
const Pusher = require('pusher');
const moment = require('moment');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const GracefulShutdownManager = require('@moebius/http-graceful-shutdown').GracefulShutdownManager;

const doorAcess = require('./dooraccess');

app.use(cors());
const port = process.env.PORT || '3000';
const API_URI = "/api";

var pusher = new Pusher({
    appId: '606710',
    key: '779a95b28683865a583e',
    secret: '6d45c543c5ea10288dd6',
    cluster: 'ap1',
    encrypted: true
  });


// Connection URL
const url = 'mongodb://localhost:27017?replicaSet=test1';

// Database Name
// use iotdb
// db.createCollection('dooraccess')
const dbName = 'iotdb';
const DOORACCESS_COLLECTION = "dooraccess";

/*
Modify Change Stream Output using Aggregation Pipelines
You can control change stream output by providing an array of one or more of the following pipeline stages when configuring the change stream:
$match, $project, $addFields, $replaceRoot, $redact
See Change Events for more information on the change stream response document format.
*/
const pipeline = [
  {
    $project: { documentKey: false }
  }
];


// Use connect method to connect to the server
MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  var doorAccessCol = db.collection(DOORACCESS_COLLECTION);
  const doorAccesschangeStream = doorAccessCol.watch(pipeline);

  doorAccesschangeStream.on("change", function(change) {
    console.log("CHANGE STREAM !!!!");
    console.log(change);
    doorAccessCol.find({})
            .toArray(function(err, dooraccess){
              console.log(dooraccess);
              pusher.trigger('front-door-access', 'new-access', dooraccess);
      });
  });
  // remove before reinsert again.
  db.collection(DOORACCESS_COLLECTION,function(err, collection){
    collection.deleteMany({},function(err, removed){
    });
  });

  doorAccessCol.insertMany(doorAcess.frontDoorAccess);

  app.get(API_URI + '/dooraccess', (req, res) => {
    doorAccessCol.find({})
            .toArray(function(err, dooraccess){
              console.log(dooraccess);
              res.status(200).json(dooraccess);
    });
    //res.json(doorAcess.frontDoorAccess);
  });
  
  app.get(API_URI + '/dooraccess/:isOk', (req, res) => {
    let isOk = req.params.isOk;
    if(isOk === '1'){
      let newDate = new Date();
      let doorAccess = { date: null, counter: 1};
      let hourValue = newDate.getHours();
      if(hourValue >= 9 && hourValue <= 11){
        doorAccess.when = 1;
      }
  
      if(hourValue >= 12 && hourValue <= 17){
        doorAccess.when = 2;
      }
  
      if(hourValue >= 18 && hourValue <= 17){
        doorAccess.when = 3;
      }
  
      var formatDate= moment(newDate).format('DD-MM-YYYY');
      doorAccess.date = formatDate;
      doorAccessCol.findOne({date: formatDate}, (err,r)=>{
        console.log(r);
        if(r == null){
          doorAccessCol.insertOne(doorAccess, function(err, r) {
            console.log(r);
          });
        }else{
          if(r.date === formatDate){
            let incrementalVal  = r.counter + 1;
            doorAccessCol.update({date:r.date}, {$set: {counter:incrementalVal}});
          }
        };
      })

      doorAccessCol.find({})
            .toArray(function(err, dooraccess){
              console.log(dooraccess);
              pusher.trigger('front-door-access', 'new-access', dooraccess);
      });
      
      res.json({message: 'added'});
    }else{
      res.status(500).json({error: "error !"});
    }
    
  });

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
    
  const server = app.listen(port, () => {
      console.log(`Listening on *:${port}`);
  });
  
  const shutdownManager = new GracefulShutdownManager(server);
  
  process.on('SIGTERM', () => {
    shutdownManager.terminate(() => {
      client.close();
      console.log('Server is gracefully terminated');
    });
  });
});
