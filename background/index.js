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
    else if(req['catch']){
      var url = `http://localhost:8000/wpm?url=${encodeURIComponent(req.catch)}`;
      $.ajax({
        type: "GET",
        url: url,
        dataType: 'json',
        success: function(data){
          chrome.storage.sync.get(async (config)=>{
            let regexp = new RegExp('https://discord.com/channels/(\\d+)/(\\d+)');
            if(sender.url.match(regexp)) return await pc_channel(config, sender.url, data);
          });
        },
        error: function(jxhr){
          return makeNotification(
                `Server Error`,
                `please check the server status`);
        }
      });
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

let makeNotification = (title, message) =>
  chrome.notifications.create(
    undefined, {
      type: "basic",
      iconUrl: '/icon.png',
      title: title,
      message: message,
    }
  );

async function pc_channel(config, url, data){
  if(!config['Authorization'])
    return makeNotification(
      `Need Authorization`,
      `You need to set Authorization Token`);

  let regexp = new RegExp('https://discord.com/channels/(\\d+)/(\\d+)');
  let m = url.match(regexp);
  window.gid = m[1]
  window.cid = m[2]
  window.authHeader = config['Authorization']
  let channelId = cid
  let sentMessage = await api.sendMessage(channelId, `p!c ${data.pm[0]}`)
  return makeNotification(`Guess Pokemon "${data.pm[0]}"!`, `Catch!`);
}

chrome.contextMenus.onClicked.addListener(function(info,tab) {
  console.log(
    "ID是：" + info.menuItemId + "\n" +
    "現在的網址是：" + info.pageUrl + "\n" +
    "選取的文字是：" + (info.selectionText ? info.selectionText : "") + "\n" +
    "現在hover元素的圖片來源：" + (info.srcUrl ? info.srcUrl : "") + "\n" +
    "現在hover的連結：" + (info.linkUrl ? info.linkUrl : "") + "\n" +
    "現在hover的frame是：" + (info.frameUrl ? info.frameUrl : "") + "\n"
  )
  let link = (info.linkUrl ? info.linkUrl : "");
  if(link.length){
    var url = `http://localhost:8000/wpm?url=${encodeURIComponent(link)}`;
    $.ajax({
      type: "GET",
      url: url,
      dataType: 'json',
      success: function(data){
        chrome.storage.sync.get(async (config)=>{
          if(info.menuItemId == "p!c copy"){
            copyToClipboard(`p!c ${data.pm[0]}`);
            return makeNotification(
              `Guess Pokemon "${data.pm[0]}"!`,
              `Copied to your Clipboard!`);
          }
          else if(info.menuItemId == "p!c channel"){
            return await pc_channel(config, info.pageUrl, data);
          }
          else if(info.menuItemId == "p!c fixchannel"){
            // TODO
            let pass = ['Authorization', 'guildId', 'channelId']
              .map(field => config[field])
              .every(value => typeof(value) == 'string' && value.length);
            if(!pass) return makeNotification(
              `Need Authorization, guildId and channelId`,
              `Please complete your setup`
            )
            window.gid = config['guildId']
            window.cid = config['channelId']
            window.authHeader = config['Authorization']
            let channelId = cid
            let sentMessage = await api.sendMessage(channelId, `p!c ${data.pm[0]}`)
            return makeNotification(`Guess Pokemon "${data.pm[0]}"!`, `Send to your chaneel`);
          }
        });

      },
      error: function(jxhr){
        return makeNotification(
                `Server Error`,
                `please check the server status`);
      }
    });
  }
});
