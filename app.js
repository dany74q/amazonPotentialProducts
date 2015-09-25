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
    var that = this;
    this.casper.then(function() {
        products.forEach(function (itemUrl) {
            that.casper.thenOpen(itemUrl);
            that.casper.then(function() {
                var title = this.evaluate(function () { return $('#productTitle').text(); });
                var price = this.evaluate(function () { return $('#priceblock_ourprice').text(); });
                var weight = this.evaluate(function () {
                    var result = $('#detail-bullets div.content li:contains(Shipping Weight)').text() ||
                        $('tr.shipping-weight td.value').text();
                    if (!result) { return 'No weight information';}
                    return result.match(/[0-9.,]+ (pounds|ounces)/g)[0];
                });
                var bsr = this.evaluate(function () {
                    var result = $('#detail-bullets div.content li:contains(Best Sellers Rank)').text() ||
                        $('tr#SalesRank td.value').text();
                    return  result.match(/#[0-9.,]+ in [a-zA-Z]+/g)[0];
                });
                var soldBy = this.evaluate(function () {
                    var soldBy = $('#merchant-info').text();
                    if (soldBy.search('Ships from and sold by Amazon') != -1) { return 'Amazon'; }
                    else if ($('#merchant-info > a:nth-child(1)').text()) { return $('#merchant-info > a:nth-child(1)').text(); }
                    else { return 'This item is only available on another website.'; }
                });
                var numOfReviews = this.evaluate(function () {
                    return $('#acrCustomerWriteReviewText').text() ?
                        '0' : $('#acrCustomerReviewText').text().match(/[0-9.,]+/g)[0];
                });
                var reviewRank = this.evaluate(function () {
                    var result = $('#avgRating > span > a > span').text();
                    return result ? result.match(/[0-9.,]+/g)[0] : 'No reviews';
                });
                var url = this.getCurrentUrl();
                var asin = this.evaluate(function () {
                    var result = $('#detail-bullets li:contains(ASIN)').text() || $('#prodDetails td.label:contains(ASIN)').next().text();
                    return result.match(/[A-Z0-9]{10}/g)[0];
                });
                console.log('URL - ' + url + '\nASIN - ' + asin + '\nTitle - ' + title, '\nPrice - ' + price + '\nWeight - ' + weight + '\nBsr - ' + bsr + '\nSold by ' + soldBy + '\nNumber of reviews - ' + numOfReviews + '\nReview rank - ' + reviewRank);
            });
        });
    })
    this.casper.run();
}

var produtLocator = new AmazonPotentialProductsLocator();
var products = produtLocator.locate();