'use strict';
/* UPDATE 21/12/25
   AUTHOR RX ABDULLAH MODIFIED FOR AUTO-RESTART & APPSTATE RETRY */
const fs = require("fs");
const path = require("path");
const utils = require('./utils');

global.Fca = new Object({
    isThread: [],
    isUser: [],
    startTime: Date.now(),
    Setting: new Map(),
    Version: require('./package.json').version,
    Stats: { messages: 0, commands: 0, errors: 0, lastError: null },
    Require: {
        fs,
        Fetch: require('got'),
        log: require("npmlog"),
        utils: require("./utils.js"),
        logger: require('./logger.js'),
        languageFile: require('./Language/index.json'),
        Security: require('./Extra/Src/uuid.js')
    },
    getText: function(...Data) {
        let Main = Data.splice(0,1).toString();
        for (let i=0;i<Data.length;i++) Main = Main.replace(RegExp(`%${i+1}`, 'g'), Data[i]);
        return Main;
    },
    Data: {
        ObjFastConfig: {
            Language: "en",
            PreKey: "",
            AutoUpdate: true,
            MainColor: "#9900FF",
            MainName: "[ MARIA-FCA ]",
            Uptime: false,
            Config: "default",
            DevMode: false,
            Login2Fa: false,
            AutoLogin: false,
            BroadCast: true,
            AuthString: "SD4S XQ32 O2JA WXB3 FUX2 OPJ7 Q7JZ 4R6Z | https://i.imgur.com/RAg3rvw.png",
            EncryptFeature: true,
            ResetDataLogin: false,
            AutoInstallNode: false,
            AntiSendAppState: true,
            AutoRestartMinutes: 0,
            RestartMQTT_Minutes: 0,
            Websocket_Extension: { Status: false, ResetData: false, AppState_Path: "appstate.json" },
            HTML: { HTML: true, UserName: "Guest", MusicLink: "" },
            AntiGetInfo: { Database_Type: "default", AntiGetThreadInfo: true, AntiGetUserInfo: true },
            Stable_Version: { Accept: false, Version: "" },
            CheckPointBypass: { 956: { Allow: false, Difficult: "Easy", Notification: "Turn on with AutoLogin!" } },
            AntiStuckAndMemoryLeak: { AutoRestart: { Use: true }, LogFile: { Use: false } }
        },
        CountTime: function() {
            if (fs.existsSync(__dirname + '/CountTime.json')) {
                try {
                    let data = Number(fs.readFileSync(__dirname + '/CountTime.json','utf8'));
                    return `${Math.floor(data/3600)} Hours`;
                } catch(e){ fs.writeFileSync(__dirname + '/CountTime.json', 0); return "0 Hours"; }
            }
            return "0 Hours";
        }
    },
    Action: async function(Type, ctx, Code, defaultFuncs) {
        switch(Type){
            case "AutoLogin": {
                const Database = require('./Extra/Database');
                const logger = global.Fca.Require.logger;
                const Email = (Database().get('Account')).replace(/"/g,'');
                const PassWord = (Database().get('Password')).replace(/"/g,'');
                require('./Main')({ email: Email, password: PassWord}, async (error, api) => {
                    if(error) {
                        logger.Error(JSON.stringify(error,null,2), ()=>logger.Error("AutoLogin Failed!", ()=>process.exit(0)));
                    }
                    try { Database().set("TempState", Database().get('Through2Fa')); }
                    catch(e){ logger.Warning(global.Fca.Require.Language.Index.ErrDatabase); logger.Error(); process.exit(0); }
                    process.exit(1);
                });
            } break;
            case "Bypass": {
                const Bypass_Module = require(`./Extra/Bypass/${Code}`);
                const logger = global.Fca.Require.logger;
                if(Code===956){
                    async function P1(){ return new Promise((resolve,reject)=>{
                        try{ utils.get('https://www.facebook.com/checkpoint/828281030927956/?next=https%3A%2F%2Faccountscenter.facebook.com%2Fpassword_and_security', ctx.jar, null, ctx.globalOptions)
                            .then(data=>resolve(Bypass_Module.Check(data.body)));
                        }catch(e){ reject(e); }
                    }) }
                    try{
                        const test = await P1();
                        if(test) {
                            const resp = await Bypass_Module.Cook_And_Work(ctx, defaultFuncs);
                            if(resp===true) return logger.Success("Bypassing 956 successfully!", ()=>process.exit(1));
                            else return logger.Error("Bypass 956 failed ! DO YOUR SELF :>", ()=>process.exit(0));
                        }
                    }catch(e){ logger.Error("Bypass 956 failed ! DO YOUR SELF :>", ()=>process.exit(0)); }
                }
            } break;
            default: require('npmlog').Error("Invalid Message!");
        }
    }
});

// ===== FAST CONFIG LOAD & TYPE CHECK =====
const CONFIG_PATH = path.join(process.cwd(),"FastConfigFca.json");
if(!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, JSON.stringify(global.Fca.Data.ObjFastConfig,null,2));

let Data_Setting;
try{ Data_Setting = require(CONFIG_PATH); }
catch(e){ global.Fca.Require.logger.Error('FastConfig invalid! Restoring default'); fs.writeFileSync(CONFIG_PATH, JSON.stringify(global.Fca.Data.ObjFastConfig,null,2)); process.exit(1); }

global.Fca.Require.FastConfig = Data_Setting;

// Original Boolean/String/Number/Object checks
try{
    const Boolean_Fca = ["AntiSendAppState","AutoUpdate","Uptime","BroadCast","EncryptFeature","AutoLogin","ResetDataLogin","Login2Fa", "DevMode","AutoInstallNode"];
    const String_Fca = ["MainName","PreKey","Language","AuthString","Config"];
    const Number_Fca = ["AutoRestartMinutes","RestartMQTT_Minutes"];
    const Object_Fca = ["HTML","Stable_Version","AntiGetInfo","Websocket_Extension","CheckPointBypass","AntiStuckAndMemoryLeak"];
    const All_Variable = Boolean_Fca.concat(String_Fca,Number_Fca,Object_Fca);

    for(let i of All_Variable){
        if(Data_Setting[i]===undefined){ Data_Setting[i]=global.Fca.Data.ObjFastConfig[i]; fs.writeFileSync(CONFIG_PATH, JSON.stringify(Data_Setting,null,2)); }
    }
    for(let i in Data_Setting){
        if(Boolean_Fca.includes(i) && global.Fca.Require.utils.getType(Data_Setting[i])!=="Boolean") { global.Fca.Require.logger.Error(i+" Must be Boolean!"); process.exit(0); }
        else if(String_Fca.includes(i) && global.Fca.Require.utils.getType(Data_Setting[i])!=="String") { global.Fca.Require.logger.Error(i+" Must be String!"); process.exit(0); }
        else if(Number_Fca.includes(i) && global.Fca.Require.utils.getType(Data_Setting[i])!=="Number") { global.Fca.Require.logger.Error(i+" Must be Number!"); process.exit(0); }
        else if(Object_Fca.includes(i) && global.Fca.Require.utils.getType(Data_Setting[i])!=="Object") {
            Data_Setting[i]=global.Fca.Data.ObjFastConfig[i]; fs.writeFileSync(CONFIG_PATH, JSON.stringify(Data_Setting,null,2));
        }
    }
}catch(e){ console.error(e); }

// ===== MEMORY MONITOR =====
setInterval(()=>{
    try{
        const mem = process.memoryUsage();
        const rssMB = mem.rss/1024/1024;
        const os = require("os");
        const usedPercent = (rssMB/(os.totalmem()/1024/1024))*100;
        if(global.Fca.Require.FastConfig.AntiStuckAndMemoryLeak.AutoRestart.Use && usedPercent>=90){
            console.warn("[AUTO-RESTART] Memory usage 90%+, restarting bot...");
            startBot();
        }
    }catch(e){ console.error("[MEMORY MONITOR]", e); }
},60000);

// ===== LOGIN WITH APPSTATE FALLBACK =====
const MAX_RETRY = 5; const RETRY_DELAY = 5000;
let botInstance = null;

async function loginBot(retryCount=0){
    const MainLogin = require('./Main');
    const Database = require('./Extra/Database');
    const email = Database().get("Account")?.replace(/"/g,'');
    const password = Database().get("Password")?.replace(/"/g,'');
    const appstatePath = global.Fca.Require.FastConfig.Websocket_Extension.AppState_Path;

    return new Promise((resolve,reject)=>{
        if(fs.existsSync(appstatePath)){
            console.log("[LOGIN] Trying appstate.json login...");
            MainLogin({appState: require(path.resolve(appstatePath))}, {}, (err, api)=>{
                if(!err) return resolve(api);
                console.warn("[LOGIN] appstate invalid, fallback to credentials login...");
                retryCredentials();
            });
        } else retryCredentials();

        function retryCredentials(){
            console.log("[LOGIN] Logging in with credentials...");
            MainLogin({email,password}, {}, (err2, api2)=>{
                if(!err2) return resolve(api2);
                if(retryCount<MAX_RETRY){
                    console.warn(`[LOGIN] Retry ${retryCount+1}/${MAX_RETRY} in ${RETRY_DELAY/1000}s`);
                    setTimeout(()=>loginBot(retryCount+1).then(resolve).catch(reject), RETRY_DELAY);
                } else reject(new Error("[LOGIN] Max retries reached!"));
            });
        }
    });
}

// ===== BOT START FUNCTION =====
async function startBot(){
    try{
        botInstance = await loginBot();
        console.log("[BOT] Login successful!");

        try{ botInstance.createAITheme = require("./createAITheme")(botInstance.defaultFuncs||botInstance, botInstance, botInstance.ctx||{}); }catch(e){}
        try{ botInstance.setThreadThemeMqtt = require("./setThreadThemeMqtt")(botInstance.defaultFuncs||botInstance, botInstance, botInstance.ctx||{}); }catch(e){}

        botInstance.on && botInstance.on("error", e=>{
            console.error("[BOT ERROR]", e);
            startBot();
        });
    }catch(e){ console.error("[BOT] Failed to login:", e); setTimeout(startBot, RETRY_DELAY); }
}

// ===== EXPORT =====
module.exports = function(loginData, options, callback){
    startBot();
    callback(null, botInstance);
};

// ===== HELPER STATUS FUNCTION =====
global.Fca.getStatus = ()=>{
    const mem = process.memoryUsage();
    return {
        uptime: Date.now()-global.Fca.startTime,
        messages: global.Fca.Stats.messages,
        commands: global.Fca.Stats.commands,
        errors: global.Fca.Stats.errors,
        ramMB: (mem.rss/1024/1024).toFixed(2),
        lastError: global.Fca.Stats.lastError
    };
};
