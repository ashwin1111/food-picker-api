var express = require('express');
const axios = require('axios');
var router = express.Router();
var bodyParser = require('body-parser');
var VerifyToken = require('../auth/VerifyToken');
var i = 1;
router.use(bodyParser.urlencoded({
    extended: false
}));
router.use(bodyParser.json());

router.get('/test', VerifyToken, function(req, result) {
    var restaurantNameList = [];
    var totalOpenRestaurants, cards;
    var offset = 0;

    function getCardsWithOffset(off) {
        axios.get('https://www.swiggy.com/dapi/restaurants/list/v5?lat=11.024289&lng=76.974597&offset=' + off + '&sortBy=RELEVANCE&pageType=SEE_ALL&page_type=DESKTOP_SEE_ALL_LISTING')
            .then(res => {
                if (res.data.data.cards) {
                  var nextCards = res.data.data.cards;
                  nextCards.forEach(card => {
                      if (card.data.data.availability.opened === true) {
                          // console.log(i++, card.data.data.name)
                          restaurantNameList.push(card.data.data.name)
                      }
                  });
                  offset += 15;
                  incrementOffset();
                } else {
                  //console.log(restaurantNameList, restaurantNameList.length);
                  result.status(200).send({ res: restaurantNameList });
              }
            })
    }

    function incrementOffset() {
        if (totalOpenRestaurants > 15 && totalOpenRestaurants > offset) {
            getCardsWithOffset(offset + 15);
        }
    }
    axios.get('https://www.swiggy.com/dapi/restaurants/list/v5?lat=11.024289&lng=76.974597&offset=0&sortBy=RELEVANCE&pageType=SEE_ALL&page_type=DESKTOP_SEE_ALL_LISTING').then(res => {
        totalOpenRestaurants = res.data.data.totalSize;
        console.log('totalOpenRestaurants', totalOpenRestaurants);
        incrementOffset();
    });
});

module.exports = router;