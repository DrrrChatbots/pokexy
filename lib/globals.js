/* helper functions */
function roomTabs(f, url){
  chrome.tabs.query({
    url: url || 'https://drrr.com/room/*'
  }, (tabs) => f(tabs));
}

function sendTab(data, except, callback, after, url){
  roomTabs((tabs) => {
    if(tabs.length){
      chrome.tabs.sendMessage(tabs[0].id, data, callback);
      if(after) after();
    }
    else if(except) except();
  }, url);
}

function bcastTabs(data){
  roomTabs((tabs) =>
    tabs.forEach((tab) =>
      chrome.tabs.sendMessage(tab.id, data)));
}

function copyToClipboard(text) {
  var dummy = document.createElement("textarea");
  // to avoid breaking orgain page when copying more words
  // cant copy when adding below this code
  // dummy.style.display = 'none'
  document.body.appendChild(dummy);
  //Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
  dummy.value = text;
  dummy.select();
  dummy.setSelectionRange(0, 99999); /*For mobile devices*/
  document.execCommand("copy");
  document.body.removeChild(dummy);
}

let makeNotification = (title, message, id) =>
  chrome.notifications.create(
    id, {
      type: "basic",
      iconUrl: '/icon.png',
      title: title,
      message: message,
    }
  );

async function pc_typing(config, url){
  if(!config['Authorization']) return;
  if(url){
    let regexp = new RegExp('https://discord.com/channels/(\\d+)/(\\d+)')
    let m = url.match(regexp)
    window.gid = m[1]
    window.cid = m[2]
  }
  else{
    let pass = ['guildId', 'channelId']
      .map(field => config[field])
      .every(value => typeof(value) == 'string' && value.length);
    if(!pass) return;
    window.gid = config['guildId']
    window.cid = config['channelId']
  }
  window.authHeader = config['Authorization']
  return await api.typing(window.cid)
}


async function pc_channel(config, url, data, pastConts = [], prefix){

  // TODO add prefix use setting

  if(!config['Authorization'])
    return makeNotification(
      `Need Authorization`,
      `You need to set Authorization Token`);

  let context = "";
  if(url){
    let regexp = new RegExp('https://discord.com/channels/(\\d+)/(\\d+)')
    let m = url.match(regexp)
    window.gid = m[1]
    window.cid = m[2]
    context = `Catch!`
  }
  else{
    let pass = ['guildId', 'channelId']
      .map(field => config[field])
      .every(value => typeof(value) == 'string' && value.length);
    if(!pass) return makeNotification(
      `Need Authorization, guildId and channelId`,
      `Please complete your setup`
    )
    window.gid = config['guildId']
    window.cid = config['channelId']
    context = `Send to your chaneel`
  }
  window.authHeader = config['Authorization']
  let channelId = window.cid
  let op = `${typeof config['catchCmd'] === 'string' ? config['catchCmd'] : 'p!c'}`
  if(config && config['catch_channels']
    && config['catch_channels'][`${window.gid}/${window.cid}`].prefix){
    op = `${prefix}c`
  }
  let command = `${op} ${data.pm[0]}`.trim();
  if(pastConts.includes(command)) return false;
  let sentMessage = await api.sendMessage(channelId, command)
  makeNotification(`Guess Pokemon "${data.pm[0]}"!`, context);
  return true;
}

function pc_copy(config, data){
  copyToClipboard(`${typeof config['copyCmd'] === 'string' ? config['copyCmd'] : 'p!c'} ${data.pm[0]}`.trim());
  return makeNotification(
    `Guess Pokemon "${data.pm[0]}"!`,
    `Copied to your Clipboard!`);
}
