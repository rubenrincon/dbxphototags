var express = require('express');
var router = express.Router();

//first add the reference to the controller
const auth_controller = require('../auth_controller');
const gallery_controller = require('../gallery_controller');
const settings_controller = require('../settings_controller');

/* GET home page. */
router.get('/', auth_controller.home);
router.get('/gallery', gallery_controller.gallery);
router.get('/gallery/:name', gallery_controller.gallery);

router.get('/login', auth_controller.login);
router.get('/logout', auth_controller.logout);
router.get('/oauthredirect',auth_controller.oauthredirect);

router.get('/settings',settings_controller.getSettings);
router.put('/settings',settings_controller.updateSettings);

module.exports = router;
