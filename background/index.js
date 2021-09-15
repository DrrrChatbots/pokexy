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

async function autoCatch(config, gid, cid, limit = 75, prev_url = undefined){
  [window.gid, window.cid] = gid, cid
  window.authHeader = config['Authorization']
  let msgs = await api.getMessages(cid, {}, 75)
  let contList = []
  let exclu = false
  for(let msgidx in msgs){
    let msg = msgs[msgidx];
    if(msg.author.id == "716390085896962058"){ // if poketwo
      if(msg.content.startsWith("Congratulations") && msg.content.includes("You caught")){
        if(prev_url){
          let cont = msg.content
          let target = 'You caught a level'
          let beg = cont.indexOf(target)
          if(beg >= 0){
            let end = cont.indexOf('!', beg)
            if(end >= 0) cont = `Caught a level${cont.substring(beg + target.length, end)}`
          }
          makeNotification(`Congratulations ${msg.mentions.length ? msg.mentions[0].username : 'unknown'}!`, cont);
        }
        break;
      }
      else if(msg.embeds && msg.embeds.length || (prev_url && msgidx == msgs.length - 1)){
        if(msg.embeds[0].description
          && msg.embeds[0].description.startsWith("Guess the pokémon")
          || (prev_url && msgidx == msgs.length - 1)){

          let prefix = msg.embeds[0].description.match(/`(.*)catch <pokémon>`/)[1]

          let excluList = contList.filter(cont => cont.startsWith(`${prefix}c`))
                              .map(cont => cont.replace(`${prefix}catch`, "").replace(`${prefix}c`, "").trim().toLowerCase())

          var url = `http://localhost:8000/wpm?url=${msg.embeds[0].image.proxy_url || prev_url}`;
          //await pc_typing(config, `https://discord.com/channels/${gid}/${cid}`);
          $.ajax({
            type: "GET",
            url: url,
            dataType: 'json',
            success: async function(data){
              chrome.notifications.clear('wait server');
              data.url = `https://discord.com/channels/${gid}/${cid}`;
              data.pm = data.pm.map(name => name.toLowerCase());
              let removeValFromIndex = [];
              for(let idx in data.pm){
                if(excluList.includes(data.pm[idx]))
                  removeValFromIndex.push(idx)
              }
              for (var i = removeValFromIndex.length -1; i >= 0; i--){
                console.log(`remove ${excluList}`)
                if(data.pm) data.pm.splice(removeValFromIndex[i],1);
                if(data.img) data.dex.splice(removeValFromIndex[i],1);
                if(data.dex) data.img.splice(removeValFromIndex[i],1);
              }
              if(!data.pm.length)
                return makeNotification(`No candidates skipped`, `no candidates after scanning`);
              chrome.storage.sync.set({lastQuery: data});
              let url = `https://discord.com/channels/${gid}/${cid}`
              let toss = await pc_channel(config, url, data, contList, prefix);
              if(!toss) return;
              await new Promise(resolve => setTimeout(resolve, 3500));
              if(config['catch_channels'][`${gid}/${cid}`].check){ // recheck
                console.log("check catch status once")
                await autoCatch(config, gid, cid, 25, prev_url || msg.embeds[0].image.proxy_url);
              }
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
      //else if(msg.content.startsWith("That is the wrong pokémon!")){
      //  exclu = true;
      //}
    }
    //else if(msg.content.startsWith(`${prefix}c`) /* && exclu */){
    //  excluList.push(msg.content.replace(`${prefix}catch`, "").replace(`${prefix}c`, "").trim().toLowerCase())
    //  exclu = false;
    //}
    else if(msg.content.includes("break"))
      return makeNotification(`Meet Break`, `somebody break the autocatch`);

    if(msg.content) contList.push(msg.content.trim())
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
      chrome.notifications.getAll((notes)=>{
        for(n in notes) chrome.notifications.clear(n);
      })
      makeNotification(`AutoCatch Scanning`, `Scanning Once`);
      if(config.catch_channels){
        for(let key of Object.keys(config.catch_channels)
          .filter(k => config.catch_channels[k].enable)){
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
        //if(req.ctrl && !req.shift) await pc_typing(config, req.pageUrl);
        $.ajax({
          type: "GET",
          url: url,
          dataType: 'json',
          success: function(data){
            chrome.notifications.clear('wait server');
            data.url = req.url;
            data.pm = data.pm.map(name => name.toLowerCase());
            chrome.storage.sync.set({lastQuery: data});
            if(req.ctrl){
              if(req.shift) pc_copy(config, data);
              else{
                let regexp = new RegExp('https://discord.com/channels/(\\d+)/(\\d+)');
                if(req.url.match(regexp)) return (pc_channel(config, req.url, data).then(() => {}));
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
      chrome.storage.sync.get(async (config)=>{
        var url = `http://localhost:8000/wpm?url=${encodeURIComponent(link)}`;
        //await pc_typing(config, info.pageUrl);
        $.ajax({
          type: "GET",
          url: url,
          dataType: 'json',
          success: function(data){
            chrome.notifications.clear('wait server');
            data.url = info.pageUrl;
            chrome.storage.sync.set({lastQuery: data});
            if(info.menuItemId == "p!c copy")
              return pc_copy(config, data);
            else if(info.menuItemId == "p!c channel")
              return (pc_channel(config, info.pageUrl, data)).then(() => {});
            else if(info.menuItemId == "p!c query")
              return makeNotification(`Query Done!`, `Guess Pokemon "${data.pm[0]}"!`);
            //else if(info.menuItemId == "p!c fixchannel")
            //  return await pc_channel(config, undefined, data);
          },
          error: function(jxhr){
            chrome.notifications.clear('wait server');
            return makeNotification(
              `Server Error`,
              `please check the server status`);
          }
        });
      });
    }
  }
});
