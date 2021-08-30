var bkg = chrome.extension.getBackgroundPage;

function setProxySwitch(v){
  chrome.storage.sync.set({ 'switch_proxy': v });
  $('#proxy-switch').attr('class', `fa fa-toggle-${v ? 'on' : 'off'}`);
}

function proxy_setup(config){

  if(config['proxy_mode']){
    $('#proxy_mode').val(config['proxy_mode']);
  }

  $('#proxy_mode').change(function(){
    chrome.storage.sync.set({ proxy_mode: $(this).val() });
  });


  ['Authorization', 'guildId', 'channelId'].forEach(field => {
    config[field] && $(`#${field}`).val(config[field]);
  })

  let proxy_switch = config[`switch_proxy`] &&
    ['Authorization', 'guildId', 'channelId']
    .map(field => config[field])
    .every(value => typeof(value) == 'string' && value.length);

  if(!proxy_switch && config[`switch_proxy`]){
    chrome.storage.sync.set({
      switch_proxy: proxy_switch
    });
  }

  $('#proxy-switch').attr('class', `fa fa-toggle-${proxy_switch ? 'on' : 'off'}`);
  $('#proxy-switch-btn').click(function(){
    let v = !$('#proxy-switch').hasClass(`fa-toggle-on`);
    if(v){
      chrome.storage.sync.get(config => {
        let setAll = ['Authorization', 'guildId', 'channelId']
          .map(field => config[field])
          .every(value => typeof(value) == 'string' && value.length);
        if(setAll) setProxySwitch(v);
        else alert("Set your channel and token first");
      })
    }
    else setProxySwitch(v);
  });

  $('#authtoken-get').on('click', function(){
    let createDcTab = doNext => () => {
      chrome.tabs.create({
        active: false,
        url: 'https://discord.com/channels/@me',
      }, function(tab){
        doNext && setTimeout(doNext, 1000);
        //doNext && doNext();
      });
    }

    let sendDiscordTab = ifnotab => () =>
      sendTab({'authtoken': true}, ifnotab, token => {
        console.log(`token is ===> ${token}`);
        if(token && token.length){
          chrome.storage.sync.set({'Authorization': token})
          $('#Authorization').val(token);
        } else alert("please refetch the token");
      }, undefined, 'https://discord.com/channels/*');

    roomTabs(tabs => {
      if(tabs.length)
        chrome.tabs.reload(tabs[0].id, sendDiscordTab(() => {}))
      else
        createDcTab(sendDiscordTab(() => {}))();
      //chrome.tabs.remove(tabs.map(tab => tab.id), () => {
      //  createDcTab(sendDiscordTab(() => {}))();
      //})
    }, ["*://discord.com/*", "*://discordapp.com/*"])

    //createDcTab(sendDiscordTab(() => {}))();
    //sendDiscordTab(createDcTab(sendDiscordTab(() => {})))();
  });

  $('#authtoken-del').on('click', function(){
    chrome.storage.sync.remove('Authorization')
    $('#Authorization').val("");
    setProxySwitch(false);
  });


  $('#channel-set').on('click', function(){
    let url = prompt('input the channel URL\n(https://discord.com/channels/.../...)');
    if(url === null) return;
    let regexp = new RegExp('https://discord.com/channels/(\\d+)/(\\d+)');
    let m = url.match(regexp);
    if(m){
      let cfg = {
        'guildId': m[1],
        'channelId': m[2]
      };
      chrome.storage.sync.set(cfg);
      Object.keys(cfg).forEach(field => {
        cfg[field] && $(`#${field}`).val(cfg[field]);
      })
    }
    else alert("invalid channel URL");
  });

  $('#channel-del').on('click', function(){
    ['guildId', 'channelId'].forEach(field => {
      chrome.storage.sync.remove(field)
      $(`#${field}`).val("");
    });
    setProxySwitch(false);
  });
}

var grid_row_template = (ctx) =>
`<div class="row" style="display: -ms-flexbox; display: flex; -ms-flex-wrap: wrap; flex-wrap: wrap; padding: 0 4px;">${ctx}</div>`

var grid_col_template = (args, btns) =>
`<div class="column hover09" style="${args.colstyle}">${btns.map((b) => b(args)).join('')} </div>`

var empty_template = (name, icon) =>
`<div class="input-group">
     <span class="input-group-addon"><i class="glyphicon ${icon || 'glyphicon-music'}"></i></span>
     <span class="input-group-addon form-control panel-footer text-center">${name}</span>
 </div>`;

function show_grid(cont_name, entries, btns, callback){
  $(cont_name).html(
    !Array.isArray(entries) ? entries :
    entries.map( rargs =>
      grid_row_template(
        rargs.map( col =>
          grid_col_template(col, btns)
        ).join('')
      )
    )
  ).promise().then(()=>{
    typeof callback == 'function' && callback();
    Array.isArray(entries) && entries.forEach((rargs) => {
      rargs.forEach((args)=>{
        for(btn of btns) btn_funcbind[btn](args);
      })
    })
  });
}

function grid_of(list, n){
  return list.reduce((acc, v, idx)=>{idx % n ? acc[acc.length - 1].push(v) : acc.push([v]); return acc}, [])
}

var query_src = (args) => `${args.url}`
var query_btn = (args) =>
  `<figure><img src="${query_src(args)}" class="query-btn" style="${args.imgstyle}"
                title="${args.name}" query-url="${args.query_url}" dexno="${args.dex}"></figure>`

btn_funcbind = {
  [query_btn]: bind_query,
}

function bind_query(args){
  $(`img[src="${query_src(args)}"]`).on('click', function(event){
    if(event.shiftKey || event.ctrlKey){
      if(event.shiftKey){
        pc_copy({pm: [this.title]})
      }
      else if(event.ctrlKey){
        chrome.storage.sync.get(async (config)=>{
          let channel_url = $(this).attr('query-url')
          await pc_channel(config, channel_url, {pm: [this.title]});
        });
      }
    }
    else {
      let dex = $(this).attr('dexno')
      //alert(dex);
      chrome.tabs.create({url: `https://www.pokemon.com/us/pokedex/${this.title}`});
    }
  })
}

function query_setup(config){
  let $target = $('#query_list');

  if(!config.lastQuery || !config.lastQuery.img)
    return $('#query_list_container')
      .html(empty_template('NO LAST QUERY', 'glyphicon-info-sign'))
      .promise().then(()=>$target.collapse('show'))

  show_grid(
    '#query_list_container',
    grid_of(config.lastQuery.img.map((fn, idx)=>({
      url: `https://raw.githubusercontent.com/poketwo/data/master/images/${fn}.png`,
      name: config.lastQuery.pm[idx],
      dex: config.lastQuery.dex[idx],
      colstyle: `flex: 50%; max-width: 50%; padding: 0 4px;`,
      imgstyle: `margin-top: 8px; vertical-align: middle; width: 100%; `,
      query_url: config.lastQuery.url,
    })), 2), [query_btn], ()=>$target.collapse('show')
  );
}

$(document).ready(function(){
  $("#goto-dc").click(function(){
    chrome.tabs.create({url: 'https://discord.com/invite/BBCw3UY'});
  });
  $("#goto-repo").click(function(){
    chrome.tabs.create({url: 'https://github.com/DrrrChatbots/pokexy'});
  });

  chrome.storage.sync.get((config)=>{
    proxy_setup(config);
    query_setup(config);
    let tab = config['pop-tab'] || 'tab0';
    $(`#${tab} > a`).click();
    $('.pop-tab').on('click', function(){
      chrome.storage.sync.set({'pop-tab': this.id});
    })
  });
});
