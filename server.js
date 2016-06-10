/*-----------------------------------------------------------------------------
This is a FiOS Helper Bot which helps the customer to select their
preferred channels and FiOS TV packages.

@author: giriganapathy
@since: Jun 10, 2016 10:10 AM
-----------------------------------------------------------------------------*/
var restify = require("restify");
var builder = require("botbuilder");
var channelAndPackageMap = {};
channelAndPackageMap["A Wealth of Entertainment"] = {};
channelAndPackageMap["A Wealth of Entertainment"]["description"] = "AWE - A Wealth of Entertainment - is devoted to taking viewers on a journey of how wealth is achieved, used and enjoyed. With engaging programming that connects with a high profile audience, AWE has broad appeal across age and income demographics";
channelAndPackageMap["A Wealth of Entertainment"]["packages"] = ["Custom TV Sports & More", "Preferred HD", "Extreme HD", "Ultimate HD"];
var model = process.env.model || "https://api.projectoxford.ai/luis/v1/application?id=573c0d0c-060c-4549-8ef5-650218618c08&subscription-key=b27a7109bc1046fb9cc7cfa874e3f819&q=";
var dialog = new builder.LuisDialog(model);
var bot = new builder.BotConnectorBot(); //new builder.TextBot();
bot.add("/", dialog);
dialog.onDefault(builder.DialogAction.send("I'm sorry. I didn't understand."));
dialog.on("intent.channel", [
    function (session, args) {
        session.userData.selectedPackageName = "Custom TV Essentials";
        var entity = builder.EntityRecognizer.findEntity(args.entities, 'channel-name');
        if (null != entity) {
            var channelName = entity.entity;
            if (null != channelName) {
                session.userData.channelName = channelName;
                var channelNameSize = channelName.length;
                if (null != channelAndPackageMap) {
                    var matchedChannelArr = [];
                    for (var key in channelAndPackageMap) {
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
                            var channelObj = channelAndPackageMap[channelNameInfo];
                            packages = channelObj.packages;
                            if (null != packages && packages.length > 0) {
                                for (var pkgIdx = 0; pkgIdx < packages.length; pkgIdx++) {
                                    packageNameInfo = packages[pkgIdx];
                                    if (packageNameInfo == session.userData.selectedPackageName) {
                                        alreadyAvailableInSelectedPackageFlag = true;
                                    }
                                    else {
                                        channelFoundInOtherPackages.push(packageNameInfo);
                                    }
                                }
                            }
                        }
                        var msg = "";
                        if (alreadyAvailableInSelectedPackageFlag) {
                            //Say the channel what you are asking is already available in your selected package.
                            msg = "The channel what you are asking is already available in your selected package";
                        }
                        else {
                            if (null != channelFoundInOtherPackages && channelFoundInOtherPackages.length > 0) {
                                //Say the channel what your asking is not available in your selected package, but it is available in other packages"
                                msg = "The channel what you are asking is not available in your selected package, but it is available in other packages:\n";
                                for (var cfpIdx = 0; cfpIdx < channelFoundInOtherPackages.length; cfpIdx++) {
                                    packageNameInfo = channelFoundInOtherPackages[cfpIdx];
                                    msg = msg + cfpIdx + "." + packageNameInfo;
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
//# sourceMappingURL=server.js.map