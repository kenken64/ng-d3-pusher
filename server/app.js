const app = require('express')();
const Pusher = require('pusher');
const moment = require('moment');
const doorAcess = require('./dooraccess');

const port = process.env.PORT || '3000';
const API_URI = "/api";

var pusher = new Pusher({
    appId: '606710',
    key: '779a95b28683865a583e',
    secret: '6d45c543c5ea10288dd6',
    cluster: 'ap1',
    encrypted: true
  });

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get(API_URI + '/dooraccess', (req, res) => {
    res.json(doorAcess.frontDoorAccess);
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

    var foundAccess = doorAcess.frontDoorAccess.filter(function (doorAccess) {
      return doorAccess.date === formatDate;
    });
    console.log(foundAccess);
    if(foundAccess.length == 0){
      doorAcess.frontDoorAccess.push(doorAccess);
    }else{
      doorAcess.frontDoorAccess.forEach(function(elem, index, theArray) {
        if(theArray[index].date === formatDate){
          doorAccess.date  = foundAccess[0].date;
          doorAccess.counter  = foundAccess[0].counter + 1;
          theArray[index] = doorAccess;
        }
      });
    };
    
    pusher.trigger('front-door-access', 'new-access', doorAcess.frontDoorAccess);
    res.json({message: 'added'});
  }else{
    res.status(500).json({error: "error !"});
  }
  
});
  
app.listen(port, () => {
    console.log(`Listening on *:${port}`);
});