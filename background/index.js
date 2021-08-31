function hideDetail(e){
  e.text = "\\*".repeat(e.text.length)
  e.url = "\\*".repeat(e.url.length)
  return e;
}

function hideUser(e){
  e.user = "?".repeat(e.user.length)
  return e;
}

function cvt(mode, e){
  if(mode == "完人")
    return e.self ? e : null;
  else if(mode == "啞人")
    return e.self ? hideDetail(e) : null;
  else if(mode == "廢人")
    return e.self ? hideUser(hideDetail(e)) : null;
  else if(mode == "完房")
    return e;
  else if(mode == "啞房")
    return hideDetail(e)
  else if(mode == "暗房")
    return hideUser(e)
  else if(mode == "廢房")
    return hideDetail(hideUser(e))
  return e.self ? e : null;
}

function log2mkd(type, e){
  //type, user, text, url
  if(!e) return "";
  console.log('log data', e);
  if(type === "msg")
    return `**${e.user}**: ${e.text}${e.url? ` [URL](${e.url})`: ''}`
  if(type === "me")
    return `${e.user}: ${e.text}${e.url? ` [URL](${e.url})`: ''}`
  //if(type === "dm")
  //  return `${e.user}: ${e.text}${e.url? ` [URL](${e.url})`: ''}`
  if(type === "music")
    return `_${e.user}_ plays ${e.text}${e.url? ` [URL](${e.url})`: ''}`
  if(type === "join")
    return `${e.user} join the room`
  if(type === "leave")
    return `${e.user} leave the room`
  if(type === "new-host")
    return `${e.user} become the room owner`
  if(type === "room-description")
    return `room desc: ${e.text}`
  if(type === "room-profile")
    return `room name: ${e.text}`
  return '';
}

async function autoCatch(config, gid = "700216589190037515", cid = "879033806965850172"){
  [window.gid, window.cid] = gid, cid
  window.authHeader = config['Authorization']
  let msgs = await api.getMessages(cid)
  console.log(gid, cid)
  console.log(msgs)
  let exclu = false, excluList = []
  for(let msg of msgs){
    if(msg.author.id == "716390085896962058"){ // if poketwo
      console.log(msg)
      if(msg.content.startsWith("Congratulations") && msg.content.includes("You caught")) break;
      else if(msg.embeds && msg.embeds.length){
        if(msg.embeds[0].description.startsWith("Guess the pokémon")){
          //pc_channel(config, req.shift ? undefined: req.url, data, excluList);
          var url = `http://localhost:8000/wpm?url=${msg.embeds[0].image.proxy_url}`;
          $.ajax({
            type: "GET",
            url: url,
            dataType: 'json',
            success: async function(data){
              chrome.notifications.clear('wait server');
              chrome.storage.sync.set({lastQuery: data});
              let url = `https://discord.com/channels/${gid}/${cid}`
              await pc_channel(config, url, data);
            },
            error: function(jxhr){
              chrome.notifications.clear('wait server');
              return makeNotification(
                `Server Error`,
                `please check the server status`);
            }
          });
          break;
        }
      }
      else if(msg.content.startsWith("That is the wrong pokémon!")){
        exclu = true;
      }
    }
    else if(msg.content.startsWith("p!c") && exclu){
      excluList.push(msg.content.replace("p!c", "").trim())
      exclu = false;
    }
  }
}

let commandInfo = {
  "p!c copy": [`Catch By Coping`, `Wait Server Responding`, 'wait server'],
  "p!c channel": [`Catch Here`, `Wait Server Responding`, 'wait server'],
  "p!c query": [`Query on Popup`, `Wait Server Responding`, 'wait server'],
  //"p!c fixchannel": [`Catch and Send to Fix Channel`, `Wait Server Responding`, 'wait server'],
}


chrome.runtime.onMessage.addListener((req, sender, callback) => {
  //if(["msg", "me"].includes(req.type)){
  chrome.storage.sync.get(async (config)=>{
    let proxy_switch = config[`switch_proxy`] &&
      ['Authorization', 'guildId', 'channelId']
      .map(field => config[field])
      .every(value => typeof(value) == 'string' && value.length);

    if(!proxy_switch && config[`switch_proxy`]){
      chrome.storage.sync.set({
        switch_proxy: proxy_switch
      });
    }

    if(req.type && proxy_switch){
      window.gid = config['guildId']
      window.cid = config['channelId']
      window.authHeader = config['Authorization']
      let channelId = cid
      // Send a message
      let mkd = log2mkd(req.type, cvt(config['proxy_mode'], req))
      if(mkd.length){
        let sentMessage = await api.sendMessage(channelId, log2mkd(req.type, req))
      }
    }
    else if(req.autocatch){
      makeNotification(`AutoCatch Scanning`, `Scanning Once`);
      if(config.catch_channels){
        for(let key of Object.keys(config.catch_channels).filter(k => config.catch_channels[k])){
          console.log(key)
          let [gid, cid] = key.split("/");
          await autoCatch(config, gid, cid);
        }
      }
    }
    else if(req.notification){
      makeNotification(req.notification.title, req.notification.content);
    }
    else if(req.catch){
      let index = Number(req.ctrl) * 1 + Number(req.shift) * 2;
      if(index){
        makeNotification.apply(null,
          commandInfo[["invalid", "p!c channel", "p!c copy", "p!c query"][index]])

        var url = `http://localhost:8000/wpm?url=${encodeURIComponent(req.catch)}`;
        $.ajax({
          type: "GET",
          url: url,
          dataType: 'json',
          success: function(data){
            chrome.notifications.clear('wait server');
            data.url = req.url;
            chrome.storage.sync.set({lastQuery: data});
            if(req.ctrl){
              if(req.shift) pc_copy(data);
              else{
                chrome.storage.sync.get(async (config)=>{
                  let regexp = new RegExp('https://discord.com/channels/(\\d+)/(\\d+)');
                  if(req.url.match(regexp)) return await pc_channel(config, req.shift ? undefined: req.url, data);
                });
              }
            }
            else if(req.shift){
              makeNotification(`Query Done!`, `Guess Pokemon "${data.pm[0]}"!`);
            }
          },
          error: function(jxhr){
            chrome.notifications.clear('wait server');
            return makeNotification(
              `Server Error`,
              `please check the server status`);
          }
        });
      }
    }

  })
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    "id" : "p!c channel",
    "title": "Catch Here",
    "type": "normal",
    "documentUrlPatterns" : ["https://discord.com/channels/*/*"],
    //"contexts" : ["all", "page", "frame", "selection", "link", "editable", "image", "video", "audio", "launcher", "browser_action","page_action"],
    "contexts" : ["image"],
    //"parentId": parent,
  });
  //chrome.contextMenus.create({
  //  "id" : "p!c copy",
  //  "title": "Copy Guess",
  //  "type": "normal",
  //  "icons": { "16": "/icon.png" },
  //  //"contexts" : ["all", "page", "frame", "selection", "link", "editable", "image", "video", "audio", "launcher", "browser_action","page_action"],
  //  "contexts" : ["image"],
  //  //"parentId": parent,
  //});
});

chrome.contextMenus.onClicked.addListener(function(info,tab) {
  //console.log(
  //  "ID是：" + info.menuItemId + "\n" +
  //  "現在的網址是：" + info.pageUrl + "\n" +
  //  "選取的文字是：" + (info.selectionText ? info.selectionText : "") + "\n" +
  //  "現在hover元素的圖片來源：" + (info.srcUrl ? info.srcUrl : "") + "\n" +
  //  "現在hover的連結：" + (info.linkUrl ? info.linkUrl : "") + "\n" +
  //  "現在hover的frame是：" + (info.frameUrl ? info.frameUrl : "") + "\n"
  //)

  if(commandInfo[info.menuItemId]){
    makeNotification.apply(null, commandInfo[info.menuItemId])
    let link = (info.linkUrl ? info.linkUrl : "");
    if(link.length){
      var url = `http://localhost:8000/wpm?url=${encodeURIComponent(link)}`;
      $.ajax({
        type: "GET",
        url: url,
        dataType: 'json',
        success: function(data){
          chrome.notifications.clear('wait server');
          chrome.storage.sync.get(async (config)=>{
            data.url = info.pageUrl;
            chrome.storage.sync.set({lastQuery: data});
            if(info.menuItemId == "p!c copy")
              return pc_copy(data);
            else if(info.menuItemId == "p!c channel")
              return await pc_channel(config, info.pageUrl, data);
            else if(info.menuItemId == "p!c query")
              return makeNotification(`Query Done!`, `Guess Pokemon "${data.pm[0]}"!`);
            //else if(info.menuItemId == "p!c fixchannel")
            //  return await pc_channel(config, undefined, data);
          });
        },
        error: function(jxhr){
          chrome.notifications.clear('wait server');
          return makeNotification(
            `Server Error`,
            `please check the server status`);
        }
      });
    }
  }
});

//chrome.storage.sync.get(async config => autoCatch(config, "700216589190037515","879034385901424651"))
