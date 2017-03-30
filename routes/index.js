var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: 'Express', engine: 'ejs' });
});
/* twitter socket io */
router.get('/twitter', function (req, res) {
    res.render('twitter');
});
module.exports = router;