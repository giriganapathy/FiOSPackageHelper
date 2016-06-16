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
//bot.add("/", dialog);
bot.add("/", [
    function (session, args, next) {
        if (!session.userData.channelNames) {
            if (null != session.userData.selectedPackageName) {
                builder.DialogAction.send("Your current selection: " + session.userData.selectedPackageName);
            }
            builder.Prompts.text(session, "Please type the channel name...if you are looking for any specific channels?");
        }
        else {
            next({ "response": session.message.text });
        }
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
            //delete session.userData.channelNames;
            session.send("Sorry! i did not understand. Could you please provide me the channel name again?");
        }        
    },
    function (session, results) {
        var channelNames = results.response;
        if (null == channelNames || channelNames.length == 0) {
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
                    session.send("Error: Package and Channel Source information is missing...");
                }
            }

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
                if (alreadyAvailableInSelectedPackageFlag) {
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
                            msg = msg + ") already available in your selected package [" + session.userData.selectedPackageName + "]\n";
                            if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                                msg = msg + "However, the other channels what you asked is not available in your selected package [ <span class='user-selected-package'>" + session.userData.selectedPackageName + "</span> ], but it is available in other packages:\n\n";
                                for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                    channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                    msg = msg + "<span class='channel-info-other'>" + channelAndPackageInfo["channel"] + " </span> -  available in [" + channelAndPackageInfo["packages"].toString() + "] Packages.\n";
                                }
                            }
                            if (null != channelFoundInPremiumPackages && channelFoundInPremiumPackages.length > 0) {
                                msg = msg + "<br/>And the below channels are Premium channels (will not be available in any packages) and to be purchased separately:<br/>";
                                for (var cfpIdx = 0; cfpIdx < channelFoundInPremiumPackages.length; cfpIdx++) {
                                    channelAndPackageInfo = channelFoundInPremiumPackages[cfpIdx];
                                    msg = msg + "<span class='channel-info-premium'>" + channelAndPackageInfo["channel"] + " </span>";
                                    if ((cfpIdx + 1) != channelFoundInPremiumPackages.length) {
                                        msg = msg + ", ";
                                    }
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
                            msg = msg + ") already available in your selected package [" + session.userData.selectedPackageName + "]<br/>";
                            if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                                msg = msg + "However, the other channels what you asked is not available in your selected package [ <span class='user-selected-package'>" + session.userData.selectedPackageName + "</span> ], but it is available in other packages:<br/>";
                                for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                    channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                    msg = msg + "<span class='channel-info-other'>" + channelAndPackageInfo["channel"] + " </span> -  available in [" + channelAndPackageInfo["packages"].toString() + "] Packages.<br/>";
                                }
                            }
                            if (null != channelFoundInPremiumPackages && channelFoundInPremiumPackages.length > 0) {
                                msg = msg + "And the below channels are Premium channels (will not be available in any packages) and to be purchased separately:<br/>";
                                for (var cfpIdx = 0; cfpIdx < channelFoundInPremiumPackages.length; cfpIdx++) {
                                    channelAndPackageInfo = channelFoundInPremiumPackages[cfpIdx];
                                    msg = msg + "<span class='channel-info-premium'>" + channelAndPackageInfo["channel"] + " </span>";
                                    if ((cfpIdx + 1) != channelFoundInPremiumPackages.length) {
                                        msg = msg + ", ";
                                    }
                                }
                            }

                        }
                    }
                }
                else {                    
                    if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                        //Say the channel what your asking is not available in your selected package, but it is available in other packages"
                        if ("directline" != session.message.from.channelId) {
                            msg = "The channel what you asked is not available in your selected package [ " + session.userData.selectedPackageName + " ], but it is available in other packages:\n\n";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-other'>" + channelAndPackageInfo["channel"] + " </span> -  available in [" + channelAndPackageInfo["packages"].toString() + "] Packages.<br/>";
                            }
                            if (null != channelFoundInPremiumPackages && channelFoundInPremiumPackages.length > 0) {
                                msg = msg + "And the below channels are Premium channels (will not be available in any packages) and to be purchased separately:<br/>";
                                for (var cfpIdx = 0; cfpIdx < channelFoundInPremiumPackages.length; cfpIdx++) {
                                    channelAndPackageInfo = channelFoundInPremiumPackages[cfpIdx];
                                    msg = msg + "<span class='channel-info-premium'>" + channelAndPackageInfo["channel"] + " </span>";
                                    if ((cfpIdx + 1) != channelFoundInPremiumPackages.length) {
                                        msg = msg + ", ";
                                    }
                                }
                            }
                        }
                        else if ("directline" == session.message.from.channelId) {
                            msg = "The channel what you asked is not available in your selected package [ <span class='user-selected-package'>" + session.userData.selectedPackageName + "</span> ], but it is available in other packages:\n\n<br/>";
                            for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                msg = msg + "<span class='channel-info-other'>" + channelAndPackageInfo["channel"] + " </span> -  available in [" + channelAndPackageInfo["packages"].toString() + "] Packages.<br/>";
                            }
                            if (null != channelFoundInPremiumPackages && channelFoundInPremiumPackages.length > 0) {
                                msg = msg + "And the below channels are Premium channels (will not be available in any packages) and to be purchased separately:<br/>";
                                for (var cfpIdx = 0; cfpIdx < channelFoundInPremiumPackages.length; cfpIdx++) {
                                    channelAndPackageInfo = channelFoundInPremiumPackages[cfpIdx];
                                    msg = msg + "<span class='channel-info-premium'>" + channelAndPackageInfo["channel"] + " </span>";
                                    if ((cfpIdx + 1) != channelFoundInPremiumPackages.length) {
                                        msg = msg + ", ";
                                    }
                                }
                            }
                        }
                    }
                }
                session.send(msg);
                //builder.Prompts.confirm(session, "Do you like to search any more channels?");
            }
            else {
                //Check whether it is notify message.
                if (session.message.text.indexOf("set tv package") != -1) {
                    builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
                        if (null != err) {
                            session.endDialog("Unexpected error while parsing your answer. Try again after sometime!");
                            return;
                        }
                        var entity = builder.EntityRecognizer.findEntity(entities, 'tv-package-name');
                        if (null != entity) {
                            var tvPackageName = entity.entity;
                            if (null != tvPackageName) {
                                tvPackageName = tvPackageName.replace(/\s+/g, '');
                                if (session.userData.selectedPackageName != fiosTVPackages[tvPackageName]) {
                                    session.userData.selectedPackageName = fiosTVPackages[tvPackageName];
                                    session.send("Your current selection: " + session.userData.selectedPackageName);
                                }
                            }
                        }
                    });
                }
                else {
                    //say sorry.
                    session.send("Sorry! We dont have such channel in any packages...");
                }
            }
            //ends here...
        }
    }/*,
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

dialog.onDefault(builder.DialogAction.send("I'm sorry. I didn't understand."));
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
                    session.send("Your current selection: " + session.userData.selectedPackageName);
                }
            }
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
                session.userData.channelName = channelName;
                var channelNameSize = channelName.length;
                if (null != channelsAndPackageMap) {
                    //session.send("Map Size:" + channelsAndPackageMap.
                    var matchedChannelArr = [];
                    //session.send("debug:" + channelsAndPackageMap["Zee TV"].description);
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
                    if (matchedChannelArr.length > 0) {
                        var alreadyAvailableInSelectedPackageFlag = false;
                        var channelFoundInOtherPackages = [];
                        var packageNameInfo = "";
                        var channelNameInfo = "";
                        var packages = [];
                        var length = matchedChannelArr.length;
                        for (var idx = 0; idx < length; idx++) {
                            channelNameInfo = matchedChannelArr[idx];
                            var channelObj = channelsAndPackageMap[channelNameInfo];
                            packages = channelObj.packages;
                            if (null != packages && packages.length > 0) {
                                for (var pkgIdx = 0; pkgIdx < packages.length; pkgIdx++) {
                                    packageNameInfo = packages[pkgIdx];
                                    if (packageNameInfo == session.userData.selectedPackageName) {
                                        alreadyAvailableInSelectedPackageFlag = true;
                                    }
                                }
                                channelFoundInOtherPackages.push({ "channel": channelNameInfo, "desc": channelObj.description, "packages": packages });
                            }
                        }
                        var msg = "";
                        if (alreadyAvailableInSelectedPackageFlag) {
                            //Say the channel what you are asking is already available in your selected package.
                            msg = "The channel you asked is already available in your selected package [ " + session.userData.selectedPackageName + " ]";
                        }
                        else {
                            var channelAndPackageInfo = {};
                            if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                                if ("directline" != session.message.from.channelId) {
                                    //Say the channel what your asking is not available in your selected package, but it is available in other packages"
                                    msg = "The channel what you asked is not available in your selected package [ " + session.userData.selectedPackageName + " ], but it is available in other packages:\n";
                                    msg = "Field               | Information                             \n";
                                    msg = msg + "--------------------| ----------------------------------------\n";
                                    for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                        channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                        msg = msg + "Channel" + " | " + channelAndPackageInfo["channel"] + "\n";
                                        msg = msg + "Description" + " | " + channelAndPackageInfo["desc"] + "\n";
                                        msg = msg + "Packages" + " | " + channelAndPackageInfo["packages"].toString() + "\n";
                                    }
                                }
                                else if ("directline" == session.message.from.channelId) {
                                    msg = "The channel what you asked is not available in your selected package [ <span class='user-selected-package'>" + session.userData.selectedPackageName + "</span> ], but it is available in other packages:\n\n<br/>";
                                    msg = msg + "<table><thead/><tbody>";
                                    msg = msg + "<tr><td class='cell-field-hdr'>Field</td><td class='cell-info-hdr'>Information</td></tr>";
                                    for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                        channelAndPackageInfo = channelFoundInOtherPackages[cfpIdx];
                                        msg = msg + "<tr><td class='cell-field'>Channel" + "</td><td class='cell-info'>" + channelAndPackageInfo["channel"] + "</td></tr>\n";
                                        //msg = msg + "<tr><td class='cell-field'>Description" + "</td><td class='cell-info'>" + channelAndPackageInfo["desc"] + "</td></tr>";
                                        msg = msg + "<tr><td class='cell-field'>Packages" + "</td><td class='cell-info'>" + channelAndPackageInfo["packages"].toString() + "</td></tr>";
                                        msg = msg + "<tr><td class='cell-empty'></td><td class='cell-empty'></td></tr>";
                                    }
                                    msg = msg + "</tbody></table>";
                                }
                            }
                        }
                        session.send(msg);
                    }
                    else {
                        //say sorry.
                        session.send("Sorry! We dont have such channel in any packages...");
                    }
                }
                else {
                    session.send("Error: Package and Channel Source information is missing...");
                }
            }
            else {
                session.send("Sorry! I dont understand the channel name..Please provide more information...");
            }
        }
        else {
            session.send("Sorry! I dont understand..Please provide more information...");
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
