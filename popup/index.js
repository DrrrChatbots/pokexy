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

function init_plugin(config){
  if(config['catch_channels']){
    $('#plugin-select').empty();

    let cc = Object.keys(config['catch_channels']);

    cc.forEach((name)=>{
      $('#plugin-select').append(
        `<option style="text-align:center; text-align-last:center;"
          title="${name}"
          value="${name}">${name}</option>`);
    })

    let select_cc = config['select_cc'];

    if(select_cc){
      let enable = config['catch_channels'][select_cc];
      $('#plugin-select').val(select_cc);
      let plugin_switch = enable;
      $('#plugin-switch').attr('class', `fa fa-toggle-${enable ? 'on' : 'off'}`);
    }
  }
}


function catch_setup(config){

  init_plugin(config);

  $('#plugin-switch-btn').click(function(){
    let sel = $('#plugin-select')[0];
    let optionSelected = $("option:selected", sel);
    let valueSelected = sel.value;
    if(!valueSelected.trim().length)
      return alert("no selected catch channel")
    let v = !$('#plugin-switch').hasClass(`fa-toggle-on`);
    if(!valueSelected) return;
    chrome.storage.sync.get("catch_channels", (config)=>{
      config["catch_channels"][valueSelected] = v;
      chrome.storage.sync.set({ "catch_channels": config["catch_channels"] })
    });
    $('#plugin-switch').attr('class', `fa fa-toggle-${v ? 'on' : 'off'}`);
  });


  $('#auto_catch').on('click', function(){
    chrome.runtime.sendMessage({ 'autocatch': true });
  })

  $('#refresh_discord').on('click', function(){
    sendTab({'refresh_discord_catch': true},
      undefined, undefined, undefined,
      'https://discord.com/channels/*');
  })

  function setCheck(enable){
    if(enable){
      $('#auto_catch_check_icon')
        .removeClass('glyphicon-unchecked')
        .addClass('glyphicon-check')
    }
    else{
      $('#auto_catch_check_icon')
        .removeClass('glyphicon-check')
        .addClass('glyphicon-unchecked')
    }
  }

  setCheck(config.auto_catch_check);
  $('#auto_catch_check').on('click', function(){
    let v = !$('#auto_catch_check_icon').hasClass(`glyphicon-check`);
    chrome.storage.sync.set({ "auto_catch_check": v })
    setCheck(v);
  })


  //$('#write_plugin').on('click', function(){

  //});

  //$('#save-plugin').on('click', function(){

  //});

  $('#add_plugin').on('click', function(){

    let url = prompt('input the channel URL\n(https://discord.com/channels/.../...)');
    if(url === null) return;
    let regexp = new RegExp('https://discord.com/channels/(\\d+)/(\\d+)');
    let m = url.match(regexp);
    if(m){
      let name = `${m[1]}/${m[2]}`;
      chrome.storage.sync.get("catch_channels", (config)=>{
        config["catch_channels"] = config["catch_channels"] || {}
        config["catch_channels"][name] = false;
        chrome.storage.sync.set({ "catch_channels": config["catch_channels"] })
      });
      let $stored = $('#plugin-select');
      let idx = $('option', $stored).length;
      $stored.append(`<option style="text-align:center; text-align-last:center;"
      value="${name}" title="${name}">${name}</option>`);
      $stored[0].selectedIndex = idx;
      $stored.change();
    }
    else alert("invalid channel URL");
  });

  $('#del_plugin').on('click', function(){
    let $stored = $('#plugin-select');
    let optionSelected = $("option:selected", $stored);
    let valueSelected = $stored.val();
    if(!valueSelected) return alert("no plugin selected");
    if(valueSelected === 'chatroom_hooks')
      return alert("You cannot delete chatroom_hooks");
    if($("option", $stored).length){
      chrome.storage.sync.get("catch_channels", (config)=>{
        delete config["catch_channels"][valueSelected]
        chrome.storage.sync.set({ "catch_channels": config["catch_channels"] })
      });
      optionSelected.remove();
      $stored.change();
    }
  });

  $('#plugin-select').on('change', function (e){
    let optionSelected = $("option:selected", this);
    let valueSelected = this.value;
    chrome.storage.sync.set({
      'select_cc': valueSelected
    }, function(){
      chrome.storage.sync.get((config)=>{
        if(config["catch_channels"][valueSelected]){
          let enable = config["catch_channels"][valueSelected]
          $('#plugin-switch').attr('class', `fa fa-toggle-${enable ? 'on' : 'off'}`);
        }
        else $('#plugin-switch').attr('class', `fa fa-toggle-off`);
      });
    });
  });

  $('#catch_interval').val(config.catch_interval || 0);
  $('#catch_interval').on('change', function(e){
    let value = parseFloat(this.value)
    if(!Number.isNaN(value) && value >= 0){
      chrome.storage.sync.set({catch_interval: value})
    }
  })
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
    catch_setup(config);
    query_setup(config);
    let tab = config['pop-tab'] || 'tab0';
    $(`#${tab} > a`).click();
    $('.pop-tab').on('click', function(){
      chrome.storage.sync.set({'pop-tab': this.id});
    })
  });
});
