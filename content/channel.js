var catch_handler = null;

function catch_setup_change(){
  if(catch_handler) {
    clearInterval(catch_handler);
    chrome.runtime.sendMessage({notification: { title: `AutoCathcer Stop`, content: `Stop AutoCathcer Daemon`}});
  }
  chrome.storage.sync.get(['catch_channels', 'catch_interval'], config => {
    if(config.catch_channels &&
      Object.values(config.catch_channels)
      .some(channel => channel.enable)){
      if(config.catch_interval === 0){
        return chrome.runtime.sendMessage({notification: { title: `AutoCathcer Ignore`, content: `interval == 0, skipped`}});
      }
      let minutes = config.catch_interval || 4;
      catch_handler = setInterval(()=>{
        chrome.runtime.sendMessage({
          'autocatch': true,
        });
      }, minutes * 60 * 1000);
      chrome.runtime.sendMessage({notification: { title: `AutoCathcer Start`, content: `autocatch every ${minutes} minutes`}});
    }
  });
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(()=>{
    console.log(`██████╗  ██████╗ ██╗  ██╗██╗  ██╗██╗   ██╗██╗██╗██╗
██╔══██╗██╔═══██╗██║ ██╔╝╚██╗██╔╝╚██╗ ██╔╝██║██║██║
██████╔╝██║   ██║█████╔╝  ╚███╔╝  ╚████╔╝ ██║██║██║
██╔═══╝ ██║   ██║██╔═██╗  ██╔██╗   ╚██╔╝  ╚═╝╚═╝╚═╝
██║     ╚██████╔╝██║  ██╗██╔╝ ██╗   ██║   ██╗██╗██╗
╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝╚═╝
                                                   `);
  }, 3000);
  catch_setup_change();
});

$(document).on('click', 'img', function(event){
  if(event.shiftKey || event.ctrlKey){
    console.log(event)
    if($(this).attr('src')){
      chrome.runtime.sendMessage({
        'catch': $(this).attr('src').split('?')[0],
        'ctrl': event.ctrlKey,
        'shift': event.shiftKey,
        'url': window.location.href,
      });
    }
  }
})

chrome.runtime.onMessage.addListener(
  (req, sender, callback) => {
    if(req.authtoken && callback){
      if(localStorage.token){
        let token = localStorage.token.replace(new RegExp('"', 'g'), '')
        callback(token);
      }
      else callback(false);
    }
    else if(req.refresh_discord_catch){
      catch_setup_change();
    }
    console.log(req);
  });
