var LOCAL_PATH_TO_JQUERY_JS = 'jquery-1.11.3.min.js';

function AmazonPotentialProductsLocator() {
    this.AMAZON_BEST_SELLERS_URL = 'http://www.amazon.com/Best-Sellers/zgbs';
    this.AMAZON_REVIEW_PAGE = 'http://www.amazon.com/product-reviews/';
    this.AMAZON_PRODUCT_URL = 'http://www.amazon.com/dp/';
    this.casper = require('casper').create({
        clientScripts: [LOCAL_PATH_TO_JQUERY_JS],
        verbose: true,
        logLevel: "error",
        pageSettings: {
            "userAgent": '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2414.0 Safari/537.36"',
            "loadImages": true,
            "loadPlugins": false,
            "webSecurityEnabled": false,
            "ignoreSslErrors": true
        },
    });
    this.casper.on('resource.requested', function (requestData, request) {
        if (requestData.url.search('amazon-adsystem') != -1) {
            request.abort();
        }
    });
    this.casper.start();
    this.products = [];
}

AmazonPotentialProductsLocator.prototype.locate = function() {
    this.casper.open(this.AMAZON_BEST_SELLERS_URL);
    var categoryUrls = [];
    this.casper.then(function() {
        categoryUrls = this.evaluate(function() {
            return $('#zg_browseRoot > ul > li a').map(function() { return this.href; });
        });
    });
    this.casper.then(function() {
        console.log(categoryUrls[0]);
    });
    this.casper.then(function() {
        this.open(categoryUrls[0]);
    });
    var subCategories = [];
    this.casper.then(function() {
        subCategories = this.evaluate(function() {
            return $('#zg_browseRoot > ul > ul > li a').map(function () { return this.href; });
        })
    });
    this.casper.then(function() {
        console.log(subCategories[0]);
    });
    this.casper.then(function() {
        this.open(subCategories[0]);
    });
    var products = [];
    this.casper.then(function() {
        products = this.evaluate(function() {
            return $('#zg_centerListWrapper div.zg_itemWrapper div.zg_title a').map(function () { return this.href; }).toArray();
        });
    });
    this.casper.then(function() {
        products.forEach(function(item) {
            console.log(item);
        });
    })
    this.casper.run();
}

var produtLocator = new AmazonPotentialProductsLocator();
var products = produtLocator.locate();