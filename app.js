var fs = require('fs');
var LOCAL_PATH_TO_JQUERY_JS = 'jquery-1.11.3.min.js';

function AmazonPotentialProductsLocator() {
    this.BAD_CATEGORIES = [
        'Appliances',
        'Appstore for Android',
        'Arts, Crafts & Sewing',
        'Automotive',
        'Baby',
        'Beauty',
        'Books',
        'Camera & Photo',
        'Cell Phones & Accessories',
        'Clothing',
        'Collectible Coins',
        'Computers & Accessories',
        'Electronics',
        'Entertainment Collectibles',
        'Gift Cards',
        'Grocery & Gourmet Food',
        'Health & Personal Care',
        'Jewelry',
        'Kindle Store',
        'MP3 Downloads',
        'Magazines',
        'Movies & TV',
        'Music',
        'Prime Pantry',
        'Shoes',
        'Software',
        'Video Games'
    ];
    this.AMAZON_BEST_SELLERS_URL = 'http://www.amazon.com/Best-Sellers/zgbs';
    this.AMAZON_REVIEW_PAGE = 'http://www.amazon.com/product-reviews/';
    this.AMAZON_PRODUCT_URL = 'http://www.amazon.com/dp/';
    this.casper = require('casper').create({
        clientScripts: [LOCAL_PATH_TO_JQUERY_JS],
        verbose: true,
        logLevel: "debug",
        pageSettings: {
            "userAgent": '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2414.0 Safari/537.36"',
            "loadImages": true,
            "loadPlugins": false,
            "webSecurityEnabled": false,
            "ignoreSslErrors": true
        }
    });
    this.casper.on('resource.requested', function (requestData, request) {
        var searchedUrlsToAbort = requestData.url.match('(amazon-adsystem|about:blank|adsensecustomsearchads|cloudfront|googlesyndication)');
        if (searchedUrlsToAbort) { request.abort(); }
    });
    this.casper.start();
    this.products = [];
}

AmazonPotentialProductsLocator.prototype.locate = function () {
    var that = this;
    this.casper.open(this.AMAZON_BEST_SELLERS_URL);
    var categoryUrls = [];
    this.casper.then(function() {
        categoryUrls = this.evaluate(function (badCategories) {
            var allCategories = $('#zg_browseRoot > ul > li').map(function () { return $(this).text(); });
            var withoutBadCategories = allCategories.not(badCategories).toArray();
            var categoryUrls = [];
            withoutBadCategories.forEach(function (category) {
                categoryUrls.push($('#zg_browseRoot > ul > li:contains(' + category + ') a').attr('href'));
            });
            return categoryUrls;
        }, that.BAD_CATEGORIES);
    });
    this.casper.then(function () {
        categoryUrls.forEach(function (categoryUrl) {
            that.casper.thenOpen(categoryUrl);
            var subCategories = [];
            that.casper.then(function () {
                subCategories = this.evaluate(function () {
                    return $('#zg_browseRoot > ul > ul > li a').map(function () { return this.href; }).toArray();
                })
            });
            that.casper.then(function () {
                subCategories.forEach(function (subCategoryUrl) {
                    that.casper.thenOpen(subCategoryUrl);
                    that.casper.then(function () {
                        var pageUlrs = [];
                        that.casper.then(function () {
                            pageUlrs = this.evaluate(function () { return $('#zg_paginationWrapper li a').map(function () { return this.href; }).toArray(); });
                        });
                        that.casper.then(function () {
                            pageUlrs.forEach(function (pageUrl) {
                                that.casper.thenOpen(pageUrl);
                                var products = [];
                                that.casper.then(function () {
                                    products = this.evaluate(function () {
                                        return $('#zg_centerListWrapper div.zg_itemWrapper div.zg_title a').map(function () { return this.href; }).toArray();
                                    });
                                });
                                that.casper.then(function () {
                                    products.forEach(function (itemUrl) {
                                        that.casper.thenOpen(itemUrl);
                                        that.casper.then(function () {
                                            var title = this.evaluate(function () { return $('#productTitle').text(); });
                                            var price = this.evaluate(function () {
                                                var result = $('#priceblock_ourprice').text() || $('#priceblock_saleprice').text() || $('#priceblock_dealprice').text();
                                                return result;
                                            });
                                            var weight = this.evaluate(function () {
                                                var result = $('#detail-bullets div.content li:contains(Shipping Weight)').text() ||
                                                    $('tr.shipping-weight td.value').text();
                                                if (!result) { return 'No weight information'; }
                                                return result.replace(',', '').match(/[0-9.]+ (pounds|ounces)/g)[0];
                                            });
                                            var bsr = this.evaluate(function () {
                                                var result = $('#detail-bullets div.content li:contains(Best Sellers Rank)').text() ||
                                                    $('tr#SalesRank td.value').text() || $('li:contains(Best Sellers Rank)').text();
                                                return result.replace(/\s+/g, ' ').replace(',', '').match(/#[0-9,]+\s+in\s+[\w ,&>]+/g);
                                            });
                                            var soldBy = this.evaluate(function () {
                                                var soldBy = $('#merchant-info').text();
                                                if (soldBy.search('Ships from and sold by Amazon') != -1) { return 'Amazon'; }
                                                else if ($('#merchant-info > a:nth-child(1)').text()) { return $('#merchant-info > a:nth-child(1)').text(); }
                                                else { return 'This item is only available on another website.'; }
                                            });
                                            var numOfReviews = this.evaluate(function () {
                                                return $('#acrCustomerWriteReviewText').text() ?
                                                    '0' : $('#acrCustomerReviewText').text().replace(',', '').match(/[0-9.]+/g)[0];
                                            });
                                            var reviewRank = this.evaluate(function () {
                                                var result = $('#avgRating > span > a > span').text();
                                                return result ? result.replace(',', '').match(/[0-9.]+/g)[0] : 'No reviews';
                                            });
                                            var url = this.getCurrentUrl();
                                            var asin = this.evaluate(function () {
                                                var result = $('#detail-bullets li:contains(ASIN)').text() || $('#prodDetails td.label:contains(ASIN)').next().text() || $('li:contains(ASIN)').text();
                                                return result.match(/[A-Z0-9]{10}/g)[0];
                                            });
                                            var productObj = {
                                                url: url,
                                                asin: asin,
                                                title: title,
                                                price: price,
                                                weight: weight,
                                                bsr: bsr,
                                                soldBy: soldBy,
                                                numOfReviews: numOfReviews,
                                                reviewRank: reviewRank
                                            };
                                            try {
                                                console.log(JSON.stringify(productObj));
                                                var parsedPrice = parseFloat(price.match(/[0-9.]+/g)[0]);
                                                var parsedWeight = -1;
                                                if (weight.toLowerCase().search('pound') != -1) {
                                                    parsedWeight = parseFloat(weight.match(/[0-9.]+/g)[0]);
                                                } else if (weight.toLowerCase().search('ounce') != -1) {
                                                    parsedWeight = parseFloat(weight.match(/[0-9.]+/g)[0]) * 0.0625;
                                                }
                                                var parsedBsr = parseInt(bsr[0].match(/[0-9.]+/g)[0]);
                                                var parsedNumOfReviews = parseInt(numOfReviews);
                                                var parsedRank = parseFloat(reviewRank);
                                                console.log('Parsed price - ' + parsedPrice + '\nParsed weight - ' + parsedWeight + '\nParsed BSR - ' + parsedBsr + '\nParsed #reviews - ' + parsedNumOfReviews);
                                                if ((parsedPrice >= 8) &&
                                                    (parsedPrice <= 40) &&
                                                    (parsedWeight > 0.0) &&
                                                    (parsedWeight < 5.0) &&
                                                    (parsedBsr < 5000) &&
                                                    (parsedNumOfReviews < 1100) &&
                                                    (parsedRank < 4.3) &&
                                                    (soldBy.toLowerCase() !== 'amazon') &&
                                                    (title.toLowerCase().match('digital|electric') === null)) {

                                                    that.products.push(productObj);
                                                    fs.write('products.json', JSON.stringify(that.products), 'w');
                                                }
                                            }
                                            catch (e) { console.log('Failed parsing one of the parameters\n'); }
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    this.casper.run();
}

var produtLocator = new AmazonPotentialProductsLocator();
produtLocator.locate();