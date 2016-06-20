/*-----------------------------------------------------------------------------
This is a FiOS Helper Bot which helps the customer to select their
preferred channels and FiOS TV packages.

@author: giriganapathy
@since: Jun 10, 2016 10:10 AM
-----------------------------------------------------------------------------*/
var restify = require("restify");
var builder = require("botbuilder");
//var globalTunnel = require('global-tunnel');

var channelsAndPackageMap = require('./channelandpackage');
var fiosTVPackages = {
    "custom_tv_essentials": "Custom TV - Essentials",
    "custom_tv_sports_more": "Custom TV - Sports & More",
    "preferred_hd": "Preferred HD",
    "extreme_hd": "Extreme HD",
    "ultimate_hd": "Ultimate HD"
};

/*proxy = http://v631754:glAbundance03g$@proxy.ebiz.verizon.com:80
http - proxy=http://v631754:glAbundance03g$@proxy.ebiz.verizon.com:8080
https - proxy=http://v631754:glAbundance03g$@proxy.ebiz.verizon.com:8080


process.env.proxy = "http://v631754:glAbundance03g$@proxy.ebiz.verizon.com:80";
process.env.http_proxy = "http://v631754:glAbundance03g$@proxy.ebiz.verizon.com:80";
process.env.https_proxy = "http://v631754:glAbundance03g$@proxy.ebiz.verizon.com:8080";
globalTunnel.initialize();
*/

var model = process.env.model || "https://api.projectoxford.ai/luis/v1/application?id=573c0d0c-060c-4549-8ef5-650218618c08&subscription-key=b27a7109bc1046fb9cc7cfa874e3f819&q=";
var modelUri = "https://api.projectoxford.ai/luis/v1/application?id=573c0d0c-060c-4549-8ef5-650218618c08&subscription-key=b27a7109bc1046fb9cc7cfa874e3f819";

var dialog = new builder.LuisDialog(model);
var bot = new builder.BotConnectorBot(); //new builder.TextBot();
//globalTunnel.end();

//start with waterfall...
bot.add("/", [
    function (session, args, next) {
        if (session.message.text.indexOf("set tv package") == -1) {
            if (!session.userData.channelSearchResultsShown) {
                if (null == session.userData.selectedPackageName || session.userData.selectedPackageName.length == 0) {
                    session.userData.selectedPackageName = fiosTVPackages["custom_tv_essentials"];
                }
                var packageInfo = "Your current TV package selection is  " + session.userData.selectedPackageName;
                
                builder.Prompts.confirm(session, packageInfo + "<br/>Are you looking for any specific channels in your package?");
            }
            else {
                if (session.userData.channelSearchResultsShown) {
                    var packageInfo = "Your current TV package selection is  " + session.userData.selectedPackageName;
                    builder.Prompts.confirm(session, packageInfo + "<br/>Are you still looking for any specific channels in your package?");
                }
                else {
                    next({ "response": true });
                }
            }
        }
        else if(session.message.text.indexOf("set tv package") != -1) {
            session.beginDialog('/query-package-luis');
        }
    },
    function (session, results, next) {
        if (true === results.response) {
            if (!session.userData.channelSearchResultsShown || true == session.userData.channelSearchResultsShown) {
                session.userData.channelSearchResultsShown = false;
                builder.Prompts.text(session, "Hey .. that’s cool.. Can i have the channel names which you are looking for?");
            }
            else {
                session.beginDialog('/query-package-luis');
            }
        }
        else {
            delete session.userData.channelSearchResultsShown;
            session.endDialog("Thanks");
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.beginDialog('/query-package-luis');
        }
        else {
            session.send("Sorry! i did not understand. Could you please provide me the channel name again?");
        }
    }

]);
bot.add("/query-package-luis", dialog);
bot.add("/query-package", [
    function (session, args, next) {
        next({ "response": session.message.text });
    },
    function (session, results, next) {
        var userPreferredChannels = [];
        var channelInfo = "";
        var tempArr = [];
        if (null != results.response) {
            channelInfo = results.response;
            var commaIndex = channelInfo.indexOf(",");
            var andIndex = -1;
            if (commaIndex != -1) {
                tempArr = channelInfo.split(",");
                if (null != tempArr) {
                    for (var idx = 0; idx < tempArr.length; idx++) {
                        var channel = tempArr[idx];
                        if (null != channel) {
                            if ((idx + 1) == tempArr.length) {
                                //its a last element, so check for ' and ' word.
                                andIndex = channel.indexOf(" and ");
                                if (andIndex == -1) {
                                    andIndex = channel.indexOf(" & ");
                                }
                                if (andIndex != -1) {
                                    tempArr = channel.split(" and ");
                                    if (null != tempArr) {
                                        for (var idx = 0; idx < tempArr.length; idx++) {
                                            var channel = tempArr[idx];
                                            if (null != channel) {
                                                userPreferredChannels.push(channel.trim());
                                            }
                                        }
                                    }
                                }
                                else {
                                    //its a last element, but without a word 'and'.
                                    userPreferredChannels.push(channel.trim());
                                }
                            }
                            else {
                                userPreferredChannels.push(channel.trim());
                            }
                        }
                    }
                }
            }
            else {
                andIndex = channelInfo.indexOf(" and ");
                if (andIndex == -1) {
                    andIndex = channelInfo.indexOf(" & ");
                }
                if (andIndex != -1) {
                    tempArr = channelInfo.split(" and ");
                    if (null != tempArr) {
                        for (var idx = 0; idx < tempArr.length; idx++) {
                            var channel = tempArr[idx];
                            if (null != channel) {
                                userPreferredChannels.push(channel.trim());
                            }
                        }
                    }
                }
                else {
                    userPreferredChannels.push(channelInfo.trim());
                }

            }
            session.userData.channelNames = userPreferredChannels;
            //session.send(session.userData.channelNames);
            next({ "response": session.userData.channelNames });
        }
        else {
            session.userData.channelSearchResultsShown = false;
            session.send("Sorry! i did not understand. Could you please provide me the channel name again?");
        }
    },
    function (session, results) {
        var channelNames = results.response;
        if (null == channelNames || channelNames.length == 0) {
            session.userData.channelSearchResultsShown = false;
            session.send("Could you please provide me the channel name again?");

        } else if (null != channelNames) {
            var channelName = "";
            var matchedChannelArr = [];

            for (var chIdx = 0; chIdx < channelNames.length; chIdx++) {
                channelName = channelNames[chIdx];
                var channelNameSize = channelName.length;
                if (null != channelsAndPackageMap) {
                    for (var key in channelsAndPackageMap) {
                        var searchString = "";
                        var sourceString = "";
                        var keySize = key.length;
                        if (channelNameSize <= keySize) {
                            searchString = channelName.toLowerCase();
                            sourceString = key.toLowerCase();
                        }
                        else {
                            searchString = key.toLowerCase();
                            sourceString = channelName.toLowerCase();
                        }
                        if (sourceString == searchString) {
                            matchedChannelArr.push(key);
                        }
                        else {
                            var idxPos = sourceString.indexOf(searchString);
                            if (idxPos != -1) {
                                matchedChannelArr.push(key);
                            }
                        }
                    }
                }
                else {
                    session.userData.channelSearchResultsShown = false;
                    session.send("Error: Package and Channel Source information is missing...");
                }
            }

            var premiumChannelsPrice = {
                "1": "15", "2": "25", "3": "30"
            };

            //generate responses.
            if (matchedChannelArr.length > 0) {
                var alreadyAvailableInSelectedPackageFlag = false;
                var channelFoundInSelectedPackage = [];
                var channelFoundInOtherPackages = [];
                var channelFoundInPremiumPackages = [];
                var packageNameInfo = "";
                var channelNameInfo = "";
                var packages = [];
                var length = matchedChannelArr.length;
                for (var idx = 0; idx < length; idx++) {
                    alreadyAvailableInSelectedPackageFlag = false;
                    channelNameInfo = matchedChannelArr[idx];
                    var channelObj = channelsAndPackageMap[channelNameInfo];
                    packages = channelObj.packages;
                    if (null != packages && packages.length > 0) {
                        for (var pkgIdx = 0; pkgIdx < packages.length; pkgIdx++) {
                            packageNameInfo = packages[pkgIdx];
                            if (packageNameInfo == session.userData.selectedPackageName) {
                                alreadyAvailableInSelectedPackageFlag = true;
                                channelFoundInSelectedPackage.push({ "channel": channelNameInfo, "desc": channelObj.description });
                            }
                        }
                        if (false == alreadyAvailableInSelectedPackageFlag) {
                            channelFoundInOtherPackages.push({ "channel": channelNameInfo, "desc": channelObj.description, "packages": packages });
                        }
                    }
                    else {
                        //These channels are premium channels which are not available in the package. It has to be purchased separately.
                        channelFoundInPremiumPackages.push({ "channel": channelNameInfo, "desc": channelObj.description, "packages": packages });
                    }
                }
                var channelAndPackageInfo = {};
                var msg = "";
                //if (alreadyAvailableInSelectedPackageFlag) {
                if (null != channelFoundInSelectedPackage && channelFoundInSelectedPackage.length > 0) {
                    if ("directline" != session.message.from.channelId) {
                        //Say the channel what you are asking is already available in your selected package.
                        msg = "The channels you asked (";
                        for (var cfspIdx = 0; cfspIdx < channelFoundInSelectedPackage.length; cfspIdx++) {
                            channelAndPackageInfo = channelFoundInSelectedPackage[cfspIdx];
                            msg = msg + channelAndPackageInfo["channel"];
                            if ((cfspIdx + 1) != channelFoundInSelectedPackage.length) {
                                msg = msg + ", ";
                            }
                        }
                        msg = msg + ") already available in your selected package [<span class='user-selected-package'>" + session.userData.selectedPackageName + "</span>]\n";
                        if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                            msg = msg + "<br/>However, the other channels what you asked is not available in your selected package [ <span class='user-selected-package'>" + session.userData.selectedPackageName + "</span> ], but it is available in other packages:\n\n";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-other'>" + channelAndPackageInfo["channel"] + " </span> -  available in [" + channelAndPackageInfo["packages"].toString() + "] Packages.\n";
                            }
                        }
                        if (null != channelFoundInPremiumPackages && channelFoundInPremiumPackages.length > 0) {
                            msg = msg + "<br/><br/>And the below channels are Premium channels (will not be available in any packages) and to be purchased separately:<br/>";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInPremiumPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInPremiumPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-premium'>" + channelAndPackageInfo["channel"] + " </span>";
                                if ((cfpIdx + 1) != channelFoundInPremiumPackages.length) {
                                    msg = msg + ", ";
                                }
                            }
                            var premiumChannelCount = channelFoundInPremiumPackages.length;
                            if (premiumChannelCount < 5) {
                                msg = msg + " for $" + premiumChannelsPrice[premiumChannelCount] + "/mo.";
                            }
                            else {
                                msg = msg + " for $40/mo.";
                            }
                        }
                    }
                    else if ("directline" == session.message.from.channelId) {
                        //Say the channel what you are asking is already available in your selected package.
                        msg = "The channels you asked (";
                        for (var cfspIdx = 0; cfspIdx < channelFoundInSelectedPackage.length; cfspIdx++) {
                            channelAndPackageInfo = channelFoundInSelectedPackage[cfspIdx];
                            msg = msg + channelAndPackageInfo["channel"];
                            if ((cfspIdx + 1) != channelFoundInSelectedPackage.length) {
                                msg = msg + ", ";
                            }
                        }
                        msg = msg + ") already available in your selected package [<span class='user-selected-package'>" + session.userData.selectedPackageName + "</span>]<br/>";
                        if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                            msg = msg + "<br/>However, the other channels what you asked is not available in your selected package [ <span class='user-selected-package'>" + session.userData.selectedPackageName + "</span> ], but it is available in other packages:<br/>";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-other'>" + channelAndPackageInfo["channel"] + " </span> -  available in [" + channelAndPackageInfo["packages"].toString() + "] Packages.<br/>";
                            }
                        }
                        if (null != channelFoundInPremiumPackages && channelFoundInPremiumPackages.length > 0) {
                            msg = msg + "<br/><br/>And the below channels are Premium channels (will not be available in any packages) and to be purchased separately:<br/>";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInPremiumPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInPremiumPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-premium'>" + channelAndPackageInfo["channel"] + " </span>";
                                if ((cfpIdx + 1) != channelFoundInPremiumPackages.length) {
                                    msg = msg + ", ";
                                }
                            }
                            var premiumChannelCount = channelFoundInPremiumPackages.length;
                            if (premiumChannelCount < 5) {
                                msg = msg + " for $" + premiumChannelsPrice[premiumChannelCount] + "/mo.";
                            }
                            else {
                                msg = msg + " for $40/mo.";
                            }
                        }

                    }
                }
                else {
                    //Say the channel what your asking is not available in your selected package, but it is available in other packages"
                    if ("directline" != session.message.from.channelId) {
                        if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                            msg = "The channel what you asked is not available in your selected package [<span class='user-selected-package'>" + session.userData.selectedPackageName + "</span>], but it is available in other packages:\n\n";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-other'>" + channelAndPackageInfo["channel"] + " </span> -  available in [" + channelAndPackageInfo["packages"].toString() + "] Packages.<br/>";
                            }
                        }
                        if (null != channelFoundInPremiumPackages && channelFoundInPremiumPackages.length > 0) {
                            msg = msg + "<br/><br/>And the below channels are Premium channels (will not be available in any packages) and to be purchased separately:<br/>";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInPremiumPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInPremiumPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-premium'>" + channelAndPackageInfo["channel"] + " </span>";
                                if ((cfpIdx + 1) != channelFoundInPremiumPackages.length) {
                                    msg = msg + ", ";
                                }
                            }
                            var premiumChannelCount = channelFoundInPremiumPackages.length;
                            if (premiumChannelCount < 5) {
                                msg = msg + " for $" + premiumChannelsPrice[premiumChannelCount] + "/mo.";
                            }
                            else {
                                msg = msg + " for $40/mo.";
                            }
                        }
                    }
                    else if ("directline" == session.message.from.channelId) {
                        if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                            msg = "The channel what you asked is not available in your selected package [ <span class='user-selected-package'>" + session.userData.selectedPackageName + "</span> ], but it is available in other packages:\n\n<br/>";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-other'>" + channelAndPackageInfo["channel"] + " </span> -  available in [" + channelAndPackageInfo["packages"].toString() + "] Packages.<br/>";
                            }
                        }
                        if (null != channelFoundInPremiumPackages && channelFoundInPremiumPackages.length > 0) {
                            msg = msg + "<br/><br/>And the below channels are Premium channels (will not be available in any packages) and to be purchased separately:<br/>";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInPremiumPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInPremiumPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-premium'>" + channelAndPackageInfo["channel"] + " </span>";
                                if ((cfpIdx + 1) != channelFoundInPremiumPackages.length) {
                                    msg = msg + ", ";
                                }
                            }
                            var premiumChannelCount = channelFoundInPremiumPackages.length;
                            if (premiumChannelCount < 5) {
                                msg = msg + " for $" + premiumChannelsPrice[premiumChannelCount] + "/mo.";
                            }
                            else {
                                msg = msg + " for $40/mo.";
                            }
                        }
                    }
                }
                session.userData.channelSearchResultsShown = true;
                //session.send(msg);
                //session.replaceDialog('/');
                builder.Prompts.confirm(session, msg + "<br/><br/>Are you still looking for any specific channels in your package?");
            }
            else {
                session.userData.channelSearchResultsShown = false;
                session.send("Sorry! I did not understand...Please type the channel name again 4...");
            }
            //ends here...
        }
    },
    function (session, results, next) {
        if (true == session.userData.channelSearchResultsShown) {
            if (results.response) {
                session.userData.channelSearchResultsShown = false;
                builder.Prompts.text(session, "Hey .. that’s cool.. Can i have the channel names which you are looking for?");
            }
            else {
                delete session.userData.channelSearchResultsShown;
                session.endDialog("Thanks 2");
            }
        }
        else {
            next();
        }
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('/query-package-luis');
        }
    }

    /*,
    function (session, results) {
        if (results.response) {
            session.beginDialog("/");
        }
        else {
            delete session.userData.channelNames;
            session.endDialog();
        }
    }*/
]);

//dialog.onDefault(builder.DialogAction.send("I'm sorry. I didn't understand."));
dialog.onDefault("/query-package");

dialog.on("intent-change-tv-package", [
    function (session, args) {
        //session.userData.selectedPackageName = "Custom TV Essentials";
        //session.send("From:" + session.message.from.channelId);
        var entity = builder.EntityRecognizer.findEntity(args.entities, 'tv-package-name');
        if (null != entity) {
            var tvPackageName = entity.entity;
            if (null != tvPackageName) {
                tvPackageName = tvPackageName.replace(/\s+/g, '');
                if (session.userData.selectedPackageName != fiosTVPackages[tvPackageName]) {
                    session.userData.selectedPackageName = fiosTVPackages[tvPackageName];
                    //session.send("Your current selection: " + session.userData.selectedPackageName);

                    var packageInfo = "Your current selection: " + session.userData.selectedPackageName;
                    builder.Prompts.confirm(session, packageInfo + "<br/>Are you looking for any specific channels in your package?");
                }
            }
        }
    },
    function (session, results, next) {
        if (true === results.response) {
            session.userData.channelSearchResultsShown = false;
            builder.Prompts.text(session, "Hey .. that’s cool.. Can i have the channel names which you are looking for?");
        }
        else {
            delete session.userData.channelSearchResultsShown;
            session.endDialog("Thanks");
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.beginDialog('/query-package-luis');
        }
        else {
            session.send("Sorry! i did not understand. Could you please provide me the channel name again?");
        }
    }

]);

dialog.on("intent.channel", [
    function (session, args, next) {
        //session.userData.selectedPackageName = "Custom TV Essentials";
        //session.send("From:" + session.message.from.channelId);
        var entity = builder.EntityRecognizer.findEntity(args.entities, 'channel-name');
        if (null != entity) {
            var channelName = entity.entity;
            if (null != channelName) {
                session.message.text = channelName;
                session.beginDialog('/query-package');
            }
            else {
                //session.send("Sorry! I did not understand...Please type the channel name again...");
                session.beginDialog('/query-package');
            }
        }
        else {
            //session.send("Sorry! I did not understand...Please type the channel name again 2...");
            session.beginDialog('/query-package');
        }
    }
]);
//bot.listenStdin();
var server = restify.createServer();
server.use(bot.verifyBotFramework({ appId: process.env.appId, appSecret: process.env.appSecret }));
//server.use(bot.verifyBotFramework());
server.post("/api/messages", bot.listen());
server.listen(process.env.port, function () {
    console.log("%s listening to %s", server.name, server.url);
});
