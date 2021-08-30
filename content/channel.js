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
