var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const axios = require('axios');
var VerifyToken = require('../auth/VerifyToken');
router.use(bodyParser.urlencoded({
    extended: false
}));
router.use(bodyParser.json());
const {
    Pool, Client
} = require('pg')

const dotenv = require('dotenv')

dotenv.config()

const pool = new Pool({
    user: `${process.env.user}`,
    host: `${process.env.host}`,
    database: `${process.env.database}`,
    password: `${process.env.password}`,
    port: '5432',
    ssl: true
});

router.post('/primary', VerifyToken, async function(req, result) {
    try {
        const client = await pool.connect()
        await JSON.stringify(client.query('INSERT INTO primary_preference (email, first_name, last_name, app, food_type) VALUES ($1, $2, $3, $4, $5)', [req.userId, req.body.first_name, req.body.last_name, req.body.app, req.body.food_type], async function(err, res) {
            if (err) {
                return result.status(500).send(err)
            } else {
                client.query('COMMIT')
                return result.status(200).send({
                    auth: true,
                    msg: 'primary preference added successfully'
                });
            }

        }));
        client.release();
    } catch (e) {
        throw (e)
    }
});

router.post('/secondary', VerifyToken, async function(req, result) {
    var baseUrlforRestaurantList = 'https://www.swiggy.com/dapi/restaurants/list/v5?';
    var baseUrlforIndividualRestaurant =' https://www.swiggy.com/dapi/menu/v4/full?';
    var lat = 11.0283312;
    var lng = 77.0250919;
    var page_type = 'DESKTOP_SEE_ALL_LISTING';
    var sortBy = 'RELEVANCE';
    var filters, apiUrlForRestaurantList, apiUrlForIndividualRestaurant;
    var restaurantList = [];
    var menuIdList = [];
    var increment = 0;
    var menuItems = [];
    var offset = -16;

    axios.get('https://www.swiggy.com/dapi/restaurants/list/v5?lat=11.0283312&lng=77.0250919&offset=0&sortBy=RELEVANCE&pageType=SEE_ALL&page_type=DESKTOP_SEE_ALL_LISTING').then(res => {
        var totalOpenRestaurants = res.data.data.totalSize;
        totalOpenRestaurants = 17;
        console.log('totalOpenRestaurants', totalOpenRestaurants, offset);
        incrementOffset(totalOpenRestaurants);
    });
    
    function getApiUrlForIndividualRestaurant(menuId) {
        apiUrlForIndividualRestaurant = baseUrlforIndividualRestaurant+'lat='+lat+'&lng='+lng+'&menuId='+menuId;
        //console.log('apiUrlForIndividualRestaurant', apiUrlForIndividualRestaurant);
        return apiUrlForIndividualRestaurant;
    };

    function filterByFoodType(item) {
        console.log('filtering by food type');
        for (var i in item) {
            if (item[i].isVeg.toString() === req.body.food_type) {
                //console.log('items[i].isVeg.toString() === req.body.food_type', item[i].isVeg.toString() , req.body.food_type)
                menuItems.push(item[i]);
            }
        }
        //console.log('menuItems',menuItems)
        //result.send({});
    };

    async function getIndividualRestaurantDetails() {
        var menuIdLength = menuIdList.length;
        menuIdList.forEach(menuId => {
            
            //console.log('apiUrlForIndividualRestaurant', apiUrlForIndividualRestaurant);
            axios.get(getApiUrlForIndividualRestaurant(menuId)).then(res => {
                increment++;
                //console.log('resss', res.data.data)
                //menuItems.push(res.data.data.menu.items);
                if (req.body.food_type) {
                    filterByFoodType(res.data.data.menu.items);
                }
                if (req.body.category) {
                    //filterByCategory();
                }
                if (!req.body.food_type || !req.body.category) {
                    menuItems.push(res.data.data.menu.items);
                }
                console.log('increment',menuIdLength, increment);

                if (menuIdLength === increment) {
                   return result.status(200).send({ food_type: menuItems});
                }
            }).catch(err => {
                return result.status(200).send({ food_type: menuItems});
            });
        });
    }

    function getApiUrlForRestaurantList() {
        if (req.body.sortBy) {
            sortBy = req.body.sortBy;
        } else if (req.body.filters) {
            filters = req.body.filters;
        }
        apiUrlForRestaurantList = baseUrlforRestaurantList+'lat='+lat+'&lng='+lng+'&offset='+offset+'&sortBy='+sortBy+'&filters='+'&page_type='+page_type;
    };

    function filterres(){

      console.log(req.body.rating);
      console.log(req.body.offer);
      //console.log(restaurantList);  
    }
    function getCardsWithOffset(totalOpenRestaurants) {
        getApiUrlForRestaurantList();
        console.log('apiUrlForRestaurantList', apiUrlForRestaurantList);
        axios.get(apiUrlForRestaurantList).then(res => {
            if (res.data.data.cards) {
                var nextCards = res.data.data.cards;
                nextCards.forEach(card => {
                    if (card.data.data.availability && card.data.data.availability.opened === true) {
                        restaurantList.push(card.data.data);
                        menuIdList.push(card.data.data.id);
                    }
                });
            }
            console.log('restaurantList.length', restaurantList.length);

            incrementOffset(totalOpenRestaurants);
        });
    };

    function incrementOffset(totalOpenRestaurants) {
        offset = offset + 16;
        if (totalOpenRestaurants > 16 && totalOpenRestaurants > offset) {
            console.log('incrementing offset to ', offset+16);
            getCardsWithOffset(totalOpenRestaurants);
        } else {
            console.log('else part of increment offset');
            filterres();
            return result.status(200).send({
                res: restaurantList
            });
            //getIndividualRestaurantDetails();
            // return result.status(200).send({ food_type: menuItems});
            // return result.status(200).send({
            //     menu: menuIdList,
            //     res: restaurantList,
            //     length1: menuIdList.length,
            //     length2: restaurantList.length
            // });
        }
    };

    // getIndividualRestaurantDetails();

    // try {
    //     const client = await pool.connect()
    //     //insert into secondary_preference (email, category, rating, offers, food_type) values ('ashwinlaptop8@gmail.com', 'starter', 3.4, '50%', 'veg');
    //     await JSON.stringify(client.query('INSERT INTO secondary_preference (email, category, rating, offers, food_type) values ($1, $2, $3, $4, $5)', [req.userId, req.body.category, req.body.rating, req.body.offers, req.body.food_type], async function(err, res) {
    //                 if (err) {
    //                     return result.status(500).send(err)
    //                 } else {
    //                     client.query('COMMIT')
    //                     return result.status(200).send({
    //                         auth: true,
    //                         msg: 'secondary preference added successfully'
    //                     });
    //                 }

    //     }));
    //     client.release();
    // } catch (e) {
    //     throw (e)
    // }
});

router.post('/secondary2', async function(req, result) {
    console.log('eee');
    var updatedRestaurants = [];
    var restaurantList = [];
    var totalOpenRestaurants;
    var offset = 0;
    var rating = req.body.rating;
    var offer = req.body.offers;
    var updatedItems = [];
    var menuItems;
    var menuIdList = [];
    var increment = 0;

    function filterByRating() {
        console.log('rating');
        restaurantList.forEach(element => {
            //console.log('element.avgRating', element.avgRating);
            console.log('element.rating',element.rating);
            if (element.rating !== '--' && element.avgRating > rating) {
                console.log('element.avgRating', element.avgRating, rating, element.avgRating > rating)
                updatedRestaurants.push(element);
                console.log('got menu id from filtebyrating');
                menuIdList.push(element.id);
            }
            //console.log('updatedRestaurants',updatedRestaurants)
        })
    }

    function filterByOffer() {
        console.log('filterByOffer');
        if (req.body.rating !== '' && updatedRestaurants.length > 0) {
            updatedRestaurants.forEach(element => {
                if (element.aggregatedDiscountInfo) {
                    var str = element.aggregatedDiscountInfo.header;
                    var splittedOffer = str.split("%");
                    var splittedOffer2 = offer.split("%");
                    splittedOffer[0] = parseInt(splittedOffer[0]);
                    splittedOffer2[0] = parseInt(splittedOffer2[0]);
                    console.log('for each', splittedOffer[0], splittedOffer2[0], splittedOffer[0] > splittedOffer2[0], typeof(splittedOffer[0]), typeof(splittedOffer2[0]));
                    if (splittedOffer[0] > splittedOffer2[0]) {
                        console.log('pushing', element.name);
                        updatedRestaurants.push(element)
                    }
                }
            })

            const updatedRestaurants2 = updatedRestaurants.slice();
            // var newArray = oldArray.slice();
            // updatedRestaurants2.filter((v,i) => updatedRestaurants2.indexOf(v) == i);
            var zz = updatedRestaurants2.length-1;
            //result.send({update: updatedRestaurants2});
            var ash=0;
            console.log('lengthveliya',zz)
            for (var element in updatedRestaurants2) {
                //console.log('length',zz)
                //console.log('ash',ash);
                // console.log('element',updatedRestaurants2[element].id);
                if (updatedRestaurants2[element].aggregatedDiscountInfo) {
                    var str = updatedRestaurants2[element].aggregatedDiscountInfo.header;
                    var splittedOffer3 = str.split("%");
                    var splittedOffer4 = offer.split("%");
                    // console.log('updatedRestaurants.length',splittedOffer3[0], splittedOffer4[0])
                    // while (zz--) {
                        //console.log('splittedOffer[0] ', splittedOffer3[0], splittedOffer4[0]);
                        if (splittedOffer3[0] < splittedOffer4[0]) {
                            console.log('element',updatedRestaurants2[element].name);
                            console.log('slicing', ash, ash);
                            updatedRestaurants2.splice(ash, 1);
                        }
                        zz--;
                        ash++;
                    // }
                }
            }
            // console.log('updatedRestaurants.length',updatedRestaurants.length)
             result.send({
                 update: updatedRestaurants2,
                 update2: updatedRestaurants
                });
        } else if (req.body.rating === '' || req.body.rating === undefined) {
            console.log('only offer', req.body.rating);
            restaurantList.forEach(element => {
                if (element.aggregatedDiscountInfo) {
                    var str = element.aggregatedDiscountInfo.header;
                    var splittedOffer = str.split("%");
                    if (splittedOffer[0] > offer) {
                        updatedRestaurants.push(element)
                    }
                }
            })
        }

        // result.send({update: updatedRestaurants});
    }

    function filterByFoodType() {
        console.log('filtering by food type');
        for (item in menuItems) {
            //console.log('menuItems[item].isVeg.toString() === req.body.food_type', menuItems[item].isVeg.toString() , req.body.food_type)
            if (menuItems[item].isVeg.toString() === req.body.food_type) {
                updatedItems.push(menuItems[item]);
            }
        }
        //result.send({yay: updatedItems});
    };

    function filter() {
        if (req.body.rating !== '') {
            filterByRating();
        }
        console.log('req.body.offersreq.body.offers',req.body.offers, req.body.offers !== '')
        if (req.body.offers !== '') {
            filterByOffer();
        }
        if (req.body.rating === '' && req.body.offers === '') {
            return result.status(200).send({ update: restaurantList})            
        } else {
            return result.status(200).send({ update: updatedRestaurants})
        }
        // getIndividualRestaurantDetails();
    };

    function getIndividualRestaurantDetails() {
        var menuIdLength = menuIdList.length;
        menuIdList.forEach(element => {
            console.log(element);
            axios.get('https://www.swiggy.com/dapi/menu/v4/full?lat=11.0283312&lng=77.0250919&menuId=' + element).then(res => {
                increment++;
                menuItems = res.data.data.menu.items;
                if (req.body.food_type) {
                    filterByFoodType();
                }
                if (req.body.category) {
                    filterByCategory();
                }
                console.log('increment',menuIdLength, increment);

                if (menuIdLength === increment) {
                   return result.status(200).send({ update: updatedItems});
                }
            });
        });
    //    return result.status(200).send({ food_type: updatedItems})
    }

    function getCardsWithOffset(off) {
        axios.get('https://www.swiggy.com/dapi/restaurants/list/v5?lat=11.024289&lng=77.0250919&offset=' + off + '&sortBy=RELEVANCE&pageType=SEE_ALL&page_type=DESKTOP_SEE_ALL_LISTING')
            .then(res => {
                if (res.data.data.cards) {
                    var nextCards = res.data.data.cards;
                    nextCards.forEach(card => {
                        if (card.data.data.availability && card.data.data.availability.opened === true) {
                            restaurantList.push(card.data.data);
                            //console.log('req.body.rating, req.body.offer', req.body.rating, req.body.offer);
                            if (req.body.rating === null) {
                                // TODO: && req.body.offer === null
                                console.log('got menu id from main');
                                menuIdList.push(card.data.data.id);
                            }
                            // console.log(i++, card.data.data.name)
                            //console.log('menuIdList', menuIdList);
                        }
                    });
                    offset += 15;
                    incrementOffset();
                } else {
                    console.log('menuIdList', menuIdList);
                    filter();
                    //getIndividualRestaurantDetails();
                    // result.status(200).send({
                    //     res: updatedRestaurants
                    // });
                }
            })
    }

    function incrementOffset() {
        if (totalOpenRestaurants > 15 && totalOpenRestaurants > offset) {
            console.log('incrementing offset to ', offset+15);
            getCardsWithOffset(offset + 15);
        } else {
            //console.log('menuIdList', menuIdList.length);
            filter();
            //getIndividualRestaurantDetails();
        }
    }

    axios.get('https://www.swiggy.com/dapi/restaurants/list/v5?lat=11.024289&lng=77.0250919&offset=0&sortBy=RELEVANCE&pageType=SEE_ALL&page_type=DESKTOP_SEE_ALL_LISTING').then(res => {
        totalOpenRestaurants = res.data.data.totalSize;
        //totalOpenRestaurants = 17;
        console.log('totalOpenRestaurants', totalOpenRestaurants);
        incrementOffset();
        if (req.body.category || req.body.food_type) {
           getIndividualRestaurantDetails();
        }
    });

    // getIndividualRestaurantDetails();

    // try {
    //     const client = await pool.connect()
    //     //insert into secondary_preference (email, category, rating, offers, food_type) values ('ashwinlaptop8@gmail.com', 'starter', 3.4, '50%', 'veg');
    //     await JSON.stringify(client.query('INSERT INTO secondary_preference (email, category, rating, offers, food_type) values ($1, $2, $3, $4, $5)', [req.userId, req.body.category, req.body.rating, req.body.offers, req.body.food_type], async function(err, res) {
    //                 if (err) {
    //                     return result.status(500).send(err)
    //                 } else {
    //                     client.query('COMMIT')
    //                     return result.status(200).send({
    //                         auth: true,
    //                         msg: 'secondary preference added successfully'
    //                     });
    //                 }

    //     }));
    //     client.release();
    // } catch (e) {
    //     throw (e)
    // }
});

module.exports = router;