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

var cntrlIsPressed = false;

$(document).keydown(function(event){
  if(event.which=="17"){
    cntrlIsPressed = true;
  }
});

$(document).keyup(function(){
  cntrlIsPressed = false;
});

$(document).on('click', 'img', function(event){
  if(cntrlIsPressed){
    if($(this).attr('src')){
      chrome.runtime.sendMessage({
        'catch': $(this).attr('src').split('?')[0]
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
