var express = require('express');
var router = express.Router();

//first add the reference to the controller
const auth_controller = require('../auth_controller');
const gallery_controller = require('../gallery_controller');
const settings_controller = require('../settings_controller');

/* GET home page. */
router.get('/', gallery_controller.home);
router.get('/search/:name', gallery_controller.search);

router.get('/login', auth_controller.login);
router.get('/logout', auth_controller.logout);
router.get('/oauthredirect',auth_controller.oauthredirect);

router.get('/settings',settings_controller.settings);
router.post('/tag', settings_controller.tag);
router.post('/addface', settings_controller.addface);

module.exports = router;
