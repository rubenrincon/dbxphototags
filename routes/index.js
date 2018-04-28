var express = require('express');
var router = express.Router();

//first add the reference to the controller
var controller = require('../controller');


/* GET home page. */
router.get('/', controller.home);

router.get('/login', controller.login);

router.get('/logout', controller.logout);

router.get('/oauthredirect',controller.oauthredirect);

router.post('/tag', controller.tag);

router.post('/addface', controller.addface);

router.get('/search/:name', controller.search);

router.get('/settings',controller.settings);


module.exports = router;
