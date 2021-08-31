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
  chrome.storage.sync.get(['catch_channels', 'catch_interval'], config => {
    if(config.catch_channels && Object.values(config.catch_channels).some(x => x)){
      if(config.catch_interval === 0){
        return chrome.runtime.sendMessage({notification: { title: `AutoCathcer Ignore`, content: `interval == 0, skipped`}});
      }
      let minutes = config.catch_interval || 4;
      setInterval(()=>{
        chrome.runtime.sendMessage({
          'autocatch': true,
        });
      }, minutes * 60 * 1000);
      chrome.runtime.sendMessage({notification: { title: `AutoCathcer Start`, content: `autocatch every ${minutes} minutes`}});
    }
  });
  console.log($)
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
    console.log(req);
  });
